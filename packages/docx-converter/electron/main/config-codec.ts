import { ipcMain } from "electron";
import { parse } from "@babel/parser";
import _generate from "@babel/generator";
import * as t from "@babel/types";

const generateFn =
  (_generate as unknown as { default?: typeof _generate }).default ?? _generate;

export interface ConfigEntry {
  path: string;
  title?: string;
  theme?: string;
  rel?: string;
  encodingFormat?: string;
}

export interface ConfigData {
  title?: string;
  author?: string;
  language?: string;
  readingProgression?: "ltr" | "rtl";
  size?: string;
  theme?: string;
  image?: string;
  browser?: string;
  entry?: ConfigEntry[];
  unknownKeys: string[];
}

const KNOWN_KEYS = new Set([
  "title",
  "author",
  "language",
  "readingProgression",
  "size",
  "theme",
  "image",
  "browser",
  "entry",
]);

function parseSource(source: string): t.File {
  return parse(source, {
    sourceType: "module",
    allowImportExportEverywhere: true,
    plugins: ["typescript"],
  });
}

function findConfigObject(file: t.File): t.ObjectExpression | null {
  for (const node of file.program.body) {
    if (t.isExportDefaultDeclaration(node)) {
      const expr = node.declaration;
      if (t.isObjectExpression(expr)) return expr;
      if (
        t.isCallExpression(expr) &&
        expr.arguments[0] &&
        t.isObjectExpression(expr.arguments[0])
      ) {
        return expr.arguments[0];
      }
    } else if (t.isExpressionStatement(node)) {
      const e = node.expression;
      if (
        t.isAssignmentExpression(e) &&
        t.isMemberExpression(e.left) &&
        t.isIdentifier(e.left.object, { name: "module" }) &&
        t.isIdentifier(e.left.property, { name: "exports" })
      ) {
        if (t.isObjectExpression(e.right)) return e.right;
        if (
          t.isCallExpression(e.right) &&
          e.right.arguments[0] &&
          t.isObjectExpression(e.right.arguments[0])
        ) {
          return e.right.arguments[0];
        }
      }
    }
  }
  return null;
}

function propKey(prop: t.ObjectProperty): string | null {
  if (t.isIdentifier(prop.key) && !prop.computed) return prop.key.name;
  if (t.isStringLiteral(prop.key)) return prop.key.value;
  return null;
}

function literalToValue(node: t.Node): unknown {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value;
  if (t.isNullLiteral(node)) return null;
  if (t.isArrayExpression(node)) {
    return node.elements.map((el) => (el ? literalToValue(el) : null));
  }
  if (t.isObjectExpression(node)) {
    const obj: Record<string, unknown> = {};
    for (const p of node.properties) {
      if (!t.isObjectProperty(p)) continue;
      const k = propKey(p);
      if (k === null) continue;
      obj[k] = literalToValue(p.value);
    }
    return obj;
  }
  return undefined;
}

function valueToNode(value: unknown): t.Expression {
  if (value === null) return t.nullLiteral();
  if (typeof value === "string") return t.stringLiteral(value);
  if (typeof value === "number") return t.numericLiteral(value);
  if (typeof value === "boolean") return t.booleanLiteral(value);
  if (Array.isArray(value)) {
    return t.arrayExpression(value.map((v) => valueToNode(v)));
  }
  if (typeof value === "object") {
    const props: t.ObjectProperty[] = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      props.push(t.objectProperty(t.identifier(k), valueToNode(v)));
    }
    return t.objectExpression(props);
  }
  return t.nullLiteral();
}

export function parseConfig(source: string): ConfigData {
  const file = parseSource(source);
  const obj = findConfigObject(file);
  const data: ConfigData = { unknownKeys: [] };
  if (!obj) return data;

  for (const prop of obj.properties) {
    if (!t.isObjectProperty(prop)) {
      data.unknownKeys.push("<computed>");
      continue;
    }
    const key = propKey(prop);
    if (key === null) continue;

    if (!KNOWN_KEYS.has(key)) {
      data.unknownKeys.push(key);
      continue;
    }

    const val = literalToValue(prop.value);
    switch (key) {
      case "title":
      case "author":
      case "language":
      case "size":
      case "theme":
      case "image":
      case "browser":
        if (typeof val === "string")
          (data as Record<string, unknown>)[key] = val;
        break;
      case "readingProgression":
        if (val === "ltr" || val === "rtl") data.readingProgression = val;
        break;
      case "entry":
        if (Array.isArray(val)) {
          data.entry = val
            .map((e) => {
              if (typeof e === "string") return { path: e };
              if (e && typeof e === "object") {
                const o = e as Record<string, unknown>;
                if (typeof o.path !== "string") return null;
                const entry: ConfigEntry = { path: o.path };
                if (typeof o.title === "string") entry.title = o.title;
                if (typeof o.theme === "string") entry.theme = o.theme;
                if (typeof o.rel === "string") entry.rel = o.rel;
                if (typeof o.encodingFormat === "string")
                  entry.encodingFormat = o.encodingFormat;
                return entry;
              }
              return null;
            })
            .filter((e): e is ConfigEntry => e !== null);
        }
        break;
    }
  }
  return data;
}

export function serializeConfig(source: string, data: ConfigData): string {
  const file = source ? parseSource(source) : null;
  const obj = file ? findConfigObject(file) : null;

  if (!obj || !file) {
    const isCjs = /module\.exports/.test(source);
    const newObj = buildConfigObjectExpression(data);
    if (isCjs) {
      const ast = t.program([
        t.expressionStatement(
          t.assignmentExpression(
            "=",
            t.memberExpression(t.identifier("module"), t.identifier("exports")),
            newObj,
          ),
        ),
      ]);
      return generateFn(ast).code + "\n";
    }
    const ast = t.program([t.exportDefaultDeclaration(newObj)]);
    return generateFn(ast).code + "\n";
  }

  const updates: Record<string, t.Expression | null> = {
    title: data.title !== undefined ? valueToNode(data.title) : null,
    author: data.author !== undefined ? valueToNode(data.author) : null,
    language: data.language !== undefined ? valueToNode(data.language) : null,
    readingProgression:
      data.readingProgression !== undefined
        ? valueToNode(data.readingProgression)
        : null,
    size: data.size !== undefined ? valueToNode(data.size) : null,
    theme: data.theme !== undefined ? valueToNode(data.theme) : null,
    image: data.image !== undefined ? valueToNode(data.image) : null,
    browser: data.browser !== undefined ? valueToNode(data.browser) : null,
    entry: data.entry !== undefined ? valueToNode(data.entry) : null,
  };

  const existingKnown = new Set<string>();
  const newProps: (t.ObjectProperty | t.SpreadElement | t.ObjectMethod)[] = [];
  for (const prop of obj.properties) {
    if (!t.isObjectProperty(prop)) {
      newProps.push(prop);
      continue;
    }
    const key = propKey(prop);
    if (key === null) {
      newProps.push(prop);
      continue;
    }
    if (KNOWN_KEYS.has(key) && key in updates) {
      const update = updates[key];
      if (update === null) {
        existingKnown.add(key);
        continue;
      }
      newProps.push(t.objectProperty(prop.key, update, prop.computed, false));
      existingKnown.add(key);
    } else {
      newProps.push(prop);
    }
  }

  for (const [key, val] of Object.entries(updates)) {
    if (val !== null && !existingKnown.has(key)) {
      newProps.push(t.objectProperty(t.identifier(key), val));
    }
  }

  obj.properties = newProps;
  return generateFn(file, {
    retainLines: false,
    jsescOption: { minimal: true },
  }).code;
}

function buildConfigObjectExpression(data: ConfigData): t.ObjectExpression {
  const props: t.ObjectProperty[] = [];
  const addIfDefined = (key: string, val: unknown) => {
    if (val === undefined) return;
    props.push(t.objectProperty(t.identifier(key), valueToNode(val)));
  };
  addIfDefined("title", data.title);
  addIfDefined("author", data.author);
  addIfDefined("language", data.language);
  addIfDefined("readingProgression", data.readingProgression);
  addIfDefined("size", data.size);
  addIfDefined("theme", data.theme);
  addIfDefined("image", data.image);
  addIfDefined("browser", data.browser);
  addIfDefined("entry", data.entry);
  return t.objectExpression(props);
}

export function registerConfigCodecHandlers(): void {
  ipcMain.handle(
    "config:parse",
    async (_, source: string): Promise<ConfigData> => {
      return parseConfig(source);
    },
  );
  ipcMain.handle(
    "config:serialize",
    async (_, source: string, data: ConfigData): Promise<string> => {
      return serializeConfig(source, data);
    },
  );
}
