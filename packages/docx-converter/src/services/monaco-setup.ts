import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

let installed = false;

export function installMonacoEnvironment(): void {
  if (installed) return;
  installed = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).MonacoEnvironment = {
    getWorker(_workerId: string, label: string): Worker {
      switch (label) {
        case "json":
          return new JsonWorker();
        case "css":
        case "scss":
        case "less":
          return new CssWorker();
        case "html":
        case "handlebars":
        case "razor":
          return new HtmlWorker();
        case "typescript":
        case "javascript":
          return new TsWorker();
        default:
          return new EditorWorker();
      }
    },
  };
}

export function languageForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "css":
      return "css";
    case "html":
    case "htm":
      return "html";
    case "md":
    case "markdown":
      return "markdown";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "ts":
      return "typescript";
    case "json":
      return "json";
    case "scss":
      return "scss";
    case "less":
      return "less";
    case "xml":
    case "svg":
      return "xml";
    case "yml":
    case "yaml":
      return "yaml";
    default:
      return "plaintext";
  }
}

export const TEXT_EXTENSIONS = new Set([
  "css",
  "scss",
  "less",
  "html",
  "htm",
  "md",
  "markdown",
  "js",
  "mjs",
  "cjs",
  "ts",
  "json",
  "xml",
  "svg",
  "yml",
  "yaml",
  "txt",
]);

export function isTextFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext ? TEXT_EXTENSIONS.has(ext) : false;
}

export { monaco };
