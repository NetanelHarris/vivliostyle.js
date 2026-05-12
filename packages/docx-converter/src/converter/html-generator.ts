import type {
  ParsedDocument,
  ParsedParagraph,
  ParsedRun,
  ParsedFootnote,
  StyleConfig,
  ImageData,
  MappingRule,
} from "../types/index.js";
import { DEFAULT_STYLE_MAPPINGS } from "../types/index.js";
import { matchParagraph, matchRun } from "./rule-matcher.js";

interface GeneratorOptions {
  includeColors: boolean;
  includeFontSizes: boolean;
  embedImages: boolean;
  images: ImageData[];
  rules: MappingRule[];
}

function debugColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `hsl(${h % 360}, 80%, 42%)`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRun(
  run: ParsedRun,
  para: ParsedParagraph,
  opts: GeneratorOptions,
  _footnotes: ParsedFootnote[],
): string {
  if (run.lineBreak) return "<br>";

  if (run.footnoteRef !== undefined) {
    return `<sup><a href="#fn-${run.footnoteRef}" id="fnref-${run.footnoteRef}">${run.footnoteRef}</a></sup>`;
  }

  let html = escapeHtml(run.text);
  if (!html) return "";

  const ruleMatch = matchRun(run, para, opts.rules);

  if (ruleMatch) {
    if (ruleMatch.output.hidden) return "";
    const cls = ruleMatch.output.class
      ? ` class="${escapeHtml(ruleMatch.output.class)}"`
      : "";
    const dbg = ruleMatch.output.debug
      ? ` style="outline: 1.5px solid ${debugColor(ruleMatch.id)}"`
      : "";
    const tag = ruleMatch.output.tag || "span";
    return `<${tag}${cls}${dbg}>${html}</${tag}>`;
  }

  const styles: string[] = [];
  if (opts.includeColors && run.color) styles.push(`color: #${run.color}`);
  if (opts.includeFontSizes && run.fontSize)
    styles.push(`font-size: ${run.fontSize}pt`);

  if (styles.length > 0)
    html = `<span style="${styles.join("; ")}">${html}</span>`;
  if (run.strikethrough) html = `<s>${html}</s>`;
  if (run.underline) html = `<u>${html}</u>`;
  if (run.italic) html = `<em>${html}</em>`;
  if (run.bold) html = `<strong>${html}</strong>`;

  return html;
}

function renderParagraph(
  para: ParsedParagraph,
  styleConfig: StyleConfig,
  opts: GeneratorOptions,
  footnotes: ParsedFootnote[],
): string {
  const ruleMatch = matchParagraph(para, opts.rules);

  if (ruleMatch?.output.hidden) return "";

  const customMapping =
    !ruleMatch && styleConfig[para.styleName]?.enabled !== false
      ? styleConfig[para.styleName]
      : undefined;

  if (!ruleMatch && customMapping?.hidden) return "";

  const mapping = ruleMatch
    ? ruleMatch.output
    : (customMapping ??
      DEFAULT_STYLE_MAPPINGS[para.styleName] ?? {
        tag: "p",
        class: para.styleName.toLowerCase().replace(/\s+/g, "-"),
      });

  const tag = mapping.tag || "p";
  const cls = mapping.class ? ` class="${escapeHtml(mapping.class)}"` : "";

  let dbg = "";
  if (ruleMatch?.output.debug) {
    dbg = ` style="outline: 1.5px solid ${debugColor(ruleMatch.id)}"`;
  } else if (!ruleMatch && mapping.debug) {
    dbg = ` style="outline: 1.5px solid ${debugColor(para.styleName)}"`;
  }

  const inner = para.runs
    .map((r) => renderRun(r, para, opts, footnotes))
    .join("");

  if (!inner.trim() && tag === "p") return "";

  return `  <${tag}${cls}${dbg}>${inner}</${tag}>`;
}

function renderFootnotes(
  footnotes: ParsedFootnote[],
  opts: GeneratorOptions,
): string {
  if (footnotes.length === 0) return "";

  const stubPara: ParsedParagraph = { styleName: "Footnote Text", runs: [] };
  const items = footnotes
    .map((fn) => {
      const inner = fn.runs
        .map((r) => renderRun(r, stubPara, opts, footnotes))
        .join("");
      return `    <li id="fn-${fn.id}">${inner} <a href="#fnref-${fn.id}">↩</a></li>`;
    })
    .join("\n");

  return `  <section class="footnotes">\n    <ol>\n${items}\n    </ol>\n  </section>`;
}

export function generateHtml(
  doc: ParsedDocument,
  styleConfig: StyleConfig,
  options: Partial<GeneratorOptions> = {},
): string {
  const opts: GeneratorOptions = {
    includeColors: options.includeColors ?? false,
    includeFontSizes: options.includeFontSizes ?? false,
    embedImages: options.embedImages ?? true,
    images: options.images ?? doc.images,
    rules: options.rules ?? [],
  };

  const bodyLines: string[] = [];

  for (const para of doc.paragraphs) {
    const line = renderParagraph(para, styleConfig, opts, doc.footnotes);
    if (line) bodyLines.push(line);
  }

  const footnotesHtml = renderFootnotes(doc.footnotes, opts);
  if (footnotesHtml) bodyLines.push(footnotesHtml);

  const body = bodyLines.join("\n");

  return `<!DOCTYPE html>
<html lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
${body}
</body>
</html>`;
}

export function generateHtmlWithEmbeddedImages(
  doc: ParsedDocument,
  styleConfig: StyleConfig,
  options: Partial<GeneratorOptions> = {},
): string {
  return generateHtml(doc, styleConfig, { ...options, embedImages: true });
}

export function generateHtmlWithExternalImages(
  doc: ParsedDocument,
  styleConfig: StyleConfig,
  options: Partial<GeneratorOptions> = {},
): string {
  return generateHtml(doc, styleConfig, { ...options, embedImages: false });
}
