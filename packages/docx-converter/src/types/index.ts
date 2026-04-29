export interface StyleMapping {
  tag: string;
  class: string;
}

export interface StyleConfig {
  [styleName: string]: StyleMapping;
}

export interface ImageData {
  name: string;
  base64: string;
  mimeType: string;
}

export interface ParsedDocument {
  styleNames: string[];
  paragraphs: ParsedParagraph[];
  footnotes: ParsedFootnote[];
  images: ImageData[];
  title?: string;
  author?: string;
}

export interface ParsedParagraph {
  styleName: string;
  runs: ParsedRun[];
  listInfo?: { level: number; ordered: boolean };
}

export interface ParsedRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  fontSize?: number;
  footnoteRef?: number;
  href?: string;
  imageRef?: string;
  lineBreak?: boolean;
}

export interface ParsedFootnote {
  id: number;
  runs: ParsedRun[];
}

export const DEFAULT_STYLE_MAPPINGS: StyleConfig = {
  "Heading 1": { tag: "h1", class: "" },
  "Heading 2": { tag: "h2", class: "" },
  "Heading 3": { tag: "h3", class: "" },
  "Heading 4": { tag: "h4", class: "" },
  "Heading 5": { tag: "h5", class: "" },
  "Heading 6": { tag: "h6", class: "" },
  Normal: { tag: "p", class: "" },
  "Body Text": { tag: "p", class: "body-text" },
  Caption: { tag: "p", class: "caption" },
  Quote: { tag: "blockquote", class: "" },
  "Block Text": { tag: "blockquote", class: "" },
  Code: { tag: "pre", class: "code" },
  "Preformatted Text": { tag: "pre", class: "" },
  "List Paragraph": { tag: "p", class: "list-paragraph" },
};

export const HTML_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "blockquote",
  "pre",
  "li",
  "section",
  "article",
];

export const STORAGE_KEY = "vivliostyle-docx-config";
