export interface StyleMapping {
  tag: string;
  class: string;
  enabled?: boolean;
  debug?: boolean;
  hidden?: boolean;
}

export interface StyleConfig {
  [styleName: string]: StyleMapping;
}

export interface ImageData {
  name: string;
  base64: string;
  mimeType: string;
}

export type Alignment =
  | "left"
  | "right"
  | "center"
  | "justify"
  | "start"
  | "end";

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
  alignment?: Alignment;
  indent?: number;
}

export interface ParsedRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  fontSize?: number;
  fontName?: string;
  footnoteRef?: number;
  href?: string;
  imageRef?: string;
  lineBreak?: boolean;
}

export interface ParsedFootnote {
  id: number;
  runs: ParsedRun[];
}

export type TriState = "required" | "forbidden" | "any";

export type RunMatchMode = "all" | "any";

export interface MappingCondition {
  scope: "paragraph" | "run";
  styleName?: string;
  alignment?: Alignment;
  bold?: TriState;
  italic?: TriState;
  underline?: TriState;
  strikethrough?: TriState;
  fontSizeMin?: number;
  fontSizeMax?: number;
  color?: string;
  fontName?: string;
  indentMin?: number;
  /** Only for paragraph scope: "all" = all runs must match (default), "any" = at least one run must match */
  runMatchMode?: RunMatchMode;
}

export interface MappingRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: MappingCondition;
  output: { tag: string; class: string; debug?: boolean; hidden?: boolean };
}

export interface FullConfig {
  styleConfig: StyleConfig;
  rules: MappingRule[];
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

export const HTML_BLOCK_TAGS = [
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

export const HTML_INLINE_TAGS = [
  "span",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "mark",
  "small",
  "sub",
  "sup",
  "code",
];

export const HTML_TAGS = HTML_BLOCK_TAGS;

export const STORAGE_KEY = "vivliostyle-docx-config";
