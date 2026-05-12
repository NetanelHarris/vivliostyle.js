import type {
  ParsedDocument,
  ParsedParagraph,
  ParsedRun,
  ParsedFootnote,
  StyleConfig,
} from "../types/index.js";
import { DEFAULT_STYLE_MAPPINGS } from "../types/index.js";

const HEADING_PREFIX: Record<string, string> = {
  h1: "# ",
  h2: "## ",
  h3: "### ",
  h4: "#### ",
  h5: "##### ",
  h6: "###### ",
};

function escapeMarkdown(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/[*_`~[\]]/g, "\\$&");
}

function escapeYaml(text: string): string {
  return text.replace(/'/g, "''");
}

function getEffectiveMapping(para: ParsedParagraph, styleConfig: StyleConfig) {
  return styleConfig[para.styleName] ?? DEFAULT_STYLE_MAPPINGS[para.styleName];
}

function getEffectiveTag(
  para: ParsedParagraph,
  styleConfig: StyleConfig,
): string {
  return getEffectiveMapping(para, styleConfig)?.tag ?? "p";
}

function renderRunVfm(run: ParsedRun): string {
  if (run.lineBreak) return "<br>";
  if (run.footnoteRef !== undefined) return `[^${run.footnoteRef}]`;
  if (run.imageRef !== undefined) return `![](images/${run.imageRef})`;

  let text = escapeMarkdown(run.text);
  if (!text) return "";

  if (run.bold && run.italic) text = `***${text}***`;
  else if (run.bold) text = `**${text}**`;
  else if (run.italic) text = `*${text}*`;
  if (run.strikethrough) text = `~~${text}~~`;
  if (run.underline) text = `<u>${text}</u>`;
  if (run.href) text = `[${text}](${run.href})`;

  return text;
}

function renderParagraphVfm(
  para: ParsedParagraph,
  styleConfig: StyleConfig,
): string | null {
  if (getEffectiveMapping(para, styleConfig)?.hidden) return null;
  const tag = getEffectiveTag(para, styleConfig);

  if (tag === "pre") {
    const rawText = para.runs
      .filter((r) => !r.footnoteRef && !r.imageRef)
      .map((r) => r.text)
      .join("");
    if (!rawText.trim()) return null;
    return "```\n" + rawText + "\n```";
  }

  const content = para.runs.map((r) => renderRunVfm(r)).join("");
  if (!content.trim()) return null;

  const headingPrefix = HEADING_PREFIX[tag];
  if (headingPrefix) return headingPrefix + content;

  if (tag === "blockquote") {
    return content
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  return content;
}

function renderListItemVfm(
  para: ParsedParagraph,
  styleConfig: StyleConfig,
): string | null {
  if (getEffectiveMapping(para, styleConfig)?.hidden) return null;
  const indent = "  ".repeat(para.listInfo!.level);
  const marker = para.listInfo!.ordered ? "1." : "-";
  const content = para.runs.map((r) => renderRunVfm(r)).join("");
  return `${indent}${marker} ${content}`;
}

function renderFootnotesVfm(footnotes: ParsedFootnote[]): string {
  if (footnotes.length === 0) return "";
  return footnotes
    .map((fn) => {
      const content = fn.runs.map((r) => renderRunVfm(r)).join("");
      return `[^${fn.id}]: ${content}`;
    })
    .join("\n");
}

export function generateVfm(
  doc: ParsedDocument,
  styleConfig: StyleConfig,
): string {
  const parts: string[] = [];

  if (doc.title || doc.author) {
    parts.push("---");
    if (doc.title) parts.push(`title: '${escapeYaml(doc.title)}'`);
    if (doc.author) parts.push(`author: '${escapeYaml(doc.author)}'`);
    parts.push("---");
    parts.push("");
  }

  let i = 0;
  while (i < doc.paragraphs.length) {
    const para = doc.paragraphs[i];

    if (para.listInfo) {
      const listLines: string[] = [];
      while (i < doc.paragraphs.length && doc.paragraphs[i].listInfo) {
        const line = renderListItemVfm(doc.paragraphs[i], styleConfig);
        if (line !== null) listLines.push(line);
        i++;
      }
      if (listLines.length > 0) {
        parts.push(listLines.join("\n"));
        parts.push("");
      }
    } else {
      const rendered = renderParagraphVfm(para, styleConfig);
      if (rendered !== null) {
        parts.push(rendered);
        parts.push("");
      }
      i++;
    }
  }

  const footnotesVfm = renderFootnotesVfm(doc.footnotes);
  if (footnotesVfm) {
    parts.push(footnotesVfm);
    parts.push("");
  }

  return (
    parts
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}
