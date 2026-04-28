import type {
  ParsedDocument,
  ParsedParagraph,
  ParsedRun,
  ParsedFootnote,
  StyleConfig,
  ImageData,
} from "../types/index.js";
import { DEFAULT_STYLE_MAPPINGS } from "../types/index.js";

interface GeneratorOptions {
  includeColors: boolean;
  includeFontSizes: boolean;
  embedImages: boolean;
  images: ImageData[];
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
  opts: GeneratorOptions,
  _footnotes: ParsedFootnote[],
): string {
  if (run.footnoteRef !== undefined) {
    return `<sup><a href="#fn-${run.footnoteRef}" id="fnref-${run.footnoteRef}">${run.footnoteRef}</a></sup>`;
  }

  let html = escapeHtml(run.text);
  if (!html) return "";

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
  const mapping = styleConfig[para.styleName] ??
    DEFAULT_STYLE_MAPPINGS[para.styleName] ?? {
      tag: "p",
      class: para.styleName.toLowerCase().replace(/\s+/g, "-"),
    };

  const tag = mapping.tag || "p";
  const cls = mapping.class ? ` class="${escapeHtml(mapping.class)}"` : "";

  const inner = para.runs.map((r) => renderRun(r, opts, footnotes)).join("");

  if (!inner.trim() && tag === "p") return "";

  return `  <${tag}${cls}>${inner}</${tag}>`;
}

function renderFootnotes(
  footnotes: ParsedFootnote[],
  opts: GeneratorOptions,
): string {
  if (footnotes.length === 0) return "";

  const items = footnotes
    .map((fn) => {
      const inner = fn.runs.map((r) => renderRun(r, opts, footnotes)).join("");
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
