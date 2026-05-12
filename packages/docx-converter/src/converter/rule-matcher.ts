import type {
  MappingCondition,
  MappingRule,
  ParsedParagraph,
  ParsedRun,
  TriState,
} from "../types/index.js";

function triMatch(
  value: boolean | undefined,
  expected: TriState | undefined,
): boolean {
  if (!expected || expected === "any") return true;
  if (expected === "required") return value === true;
  return !value;
}

function normalizeColor(c: string | undefined): string | undefined {
  if (!c) return undefined;
  return c.replace(/^#/, "").toUpperCase();
}

function paragraphIsBold(para: ParsedParagraph, mode: "all" | "any"): boolean {
  const textRuns = para.runs.filter((r) => r.text && !r.lineBreak);
  if (textRuns.length === 0) return false;
  return mode === "any"
    ? textRuns.some((r) => r.bold === true)
    : textRuns.every((r) => r.bold === true);
}

function paragraphIsItalic(
  para: ParsedParagraph,
  mode: "all" | "any",
): boolean {
  const textRuns = para.runs.filter((r) => r.text && !r.lineBreak);
  if (textRuns.length === 0) return false;
  return mode === "any"
    ? textRuns.some((r) => r.italic === true)
    : textRuns.every((r) => r.italic === true);
}

function paragraphIsUnderline(
  para: ParsedParagraph,
  mode: "all" | "any",
): boolean {
  const textRuns = para.runs.filter((r) => r.text && !r.lineBreak);
  if (textRuns.length === 0) return false;
  return mode === "any"
    ? textRuns.some((r) => r.underline === true)
    : textRuns.every((r) => r.underline === true);
}

function paragraphIsStrike(
  para: ParsedParagraph,
  mode: "all" | "any",
): boolean {
  const textRuns = para.runs.filter((r) => r.text && !r.lineBreak);
  if (textRuns.length === 0) return false;
  return mode === "any"
    ? textRuns.some((r) => r.strikethrough === true)
    : textRuns.every((r) => r.strikethrough === true);
}

function matchParagraphCondition(
  cond: MappingCondition,
  para: ParsedParagraph,
): boolean {
  if (cond.scope !== "paragraph") return false;
  if (cond.styleName && cond.styleName !== para.styleName) return false;
  if (cond.alignment && cond.alignment !== para.alignment) return false;
  const mode = cond.runMatchMode ?? "all";
  if (!triMatch(paragraphIsBold(para, mode), cond.bold)) return false;
  if (!triMatch(paragraphIsItalic(para, mode), cond.italic)) return false;
  if (!triMatch(paragraphIsUnderline(para, mode), cond.underline)) return false;
  if (!triMatch(paragraphIsStrike(para, mode), cond.strikethrough))
    return false;

  const textRuns = para.runs.filter((r) => r.text && !r.lineBreak);
  if (cond.fontSizeMin !== undefined || cond.fontSizeMax !== undefined) {
    const sizeMatch = (r: ParsedRun) => {
      if (r.fontSize === undefined) return false;
      if (cond.fontSizeMin !== undefined && r.fontSize < cond.fontSizeMin)
        return false;
      if (cond.fontSizeMax !== undefined && r.fontSize > cond.fontSizeMax)
        return false;
      return true;
    };
    const passes =
      mode === "any"
        ? textRuns.some(sizeMatch)
        : textRuns.length > 0 && textRuns.every(sizeMatch);
    if (!passes) return false;
  }

  if (cond.color) {
    const want = normalizeColor(cond.color);
    const colorMatch = (r: ParsedRun) => normalizeColor(r.color) === want;
    const passes =
      mode === "any"
        ? textRuns.some(colorMatch)
        : textRuns.length > 0 && textRuns.every(colorMatch);
    if (!passes) return false;
  }

  if (cond.fontName) {
    const needle = cond.fontName.toLowerCase();
    const fontMatch = (r: ParsedRun) =>
      !!r.fontName && r.fontName.toLowerCase().includes(needle);
    const passes =
      mode === "any"
        ? textRuns.some(fontMatch)
        : textRuns.length > 0 && textRuns.every(fontMatch);
    if (!passes) return false;
  }

  if (cond.indentMin !== undefined) {
    if (para.indent === undefined || para.indent < cond.indentMin) return false;
  }

  return true;
}

function matchRunCondition(
  cond: MappingCondition,
  run: ParsedRun,
  para: ParsedParagraph,
): boolean {
  if (cond.scope !== "run") return false;
  if (cond.styleName && cond.styleName !== para.styleName) return false;
  if (cond.alignment && cond.alignment !== para.alignment) return false;
  if (!triMatch(run.bold, cond.bold)) return false;
  if (!triMatch(run.italic, cond.italic)) return false;
  if (!triMatch(run.underline, cond.underline)) return false;
  if (!triMatch(run.strikethrough, cond.strikethrough)) return false;

  if (
    cond.fontSizeMin !== undefined &&
    (run.fontSize === undefined || run.fontSize < cond.fontSizeMin)
  )
    return false;
  if (
    cond.fontSizeMax !== undefined &&
    (run.fontSize === undefined || run.fontSize > cond.fontSizeMax)
  )
    return false;

  if (cond.color) {
    const want = normalizeColor(cond.color);
    const got = normalizeColor(run.color);
    if (!got || got !== want) return false;
  }

  if (cond.fontName) {
    if (
      !run.fontName ||
      !run.fontName.toLowerCase().includes(cond.fontName.toLowerCase())
    )
      return false;
  }

  return true;
}

export function matchParagraph(
  para: ParsedParagraph,
  rules: MappingRule[],
): MappingRule | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.condition.scope !== "paragraph") continue;
    if (matchParagraphCondition(rule.condition, para)) return rule;
  }
  return null;
}

export function matchRun(
  run: ParsedRun,
  para: ParsedParagraph,
  rules: MappingRule[],
): MappingRule | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.condition.scope !== "run") continue;
    if (matchRunCondition(rule.condition, run, para)) return rule;
  }
  return null;
}
