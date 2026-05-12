import JSZip from "jszip";
import type {
  ParsedDocument,
  ParsedParagraph,
  ParsedRun,
  ParsedFootnote,
  ImageData,
  Alignment,
} from "../types/index.js";

function getAttrVal(el: Element, localName: string): string {
  return el.getAttribute(`w:${localName}`) ?? el.getAttribute(localName) ?? "";
}

interface RPrProps {
  b?: boolean;
  bCs?: boolean;
  i?: boolean;
  iCs?: boolean;
  u?: boolean;
  strike?: boolean;
  color?: string;
  sz?: number;
  szCs?: number;
  fontAscii?: string;
  fontCs?: string;
  rtl?: boolean;
  hintCs?: boolean;
}

interface PPrProps {
  alignment?: Alignment;
  indent?: number;
}

interface ParsedStyle {
  name: string;
  basedOn?: string;
  type: string;
  pPr: PPrProps;
  rPr: RPrProps;
}

type StyleMap = Map<string, ParsedStyle>;

function readBoolProp(parent: Element, tag: string): boolean | undefined {
  const el = parent.querySelector(tag);
  if (!el) return undefined;
  const val = el.getAttribute("w:val") ?? el.getAttribute("val");
  if (val === "false" || val === "0") return false;
  return true;
}

function mapAlignment(jcVal: string): Alignment | undefined {
  switch (jcVal) {
    case "left":
    case "right":
    case "center":
    case "start":
    case "end":
      return jcVal;
    case "both":
    case "distribute":
      return "justify";
    default:
      return undefined;
  }
}

function extractRPrProps(rPr: Element | null): RPrProps {
  if (!rPr) return {};
  const out: RPrProps = {};
  out.b = readBoolProp(rPr, "b");
  out.bCs = readBoolProp(rPr, "bCs");
  out.i = readBoolProp(rPr, "i");
  out.iCs = readBoolProp(rPr, "iCs");
  out.u = readBoolProp(rPr, "u");
  out.strike = readBoolProp(rPr, "strike");
  out.rtl = readBoolProp(rPr, "rtl");

  const colorEl = rPr.querySelector("color");
  if (colorEl) {
    const c = getAttrVal(colorEl, "val");
    if (c && c !== "auto") out.color = c;
  }

  const szEl = rPr.querySelector("sz");
  if (szEl) {
    const v = parseInt(getAttrVal(szEl, "val"), 10);
    if (!isNaN(v)) out.sz = Math.round(v / 2);
  }
  const szCsEl = rPr.querySelector("szCs");
  if (szCsEl) {
    const v = parseInt(getAttrVal(szCsEl, "val"), 10);
    if (!isNaN(v)) out.szCs = Math.round(v / 2);
  }

  const fontsEl = rPr.querySelector("rFonts");
  if (fontsEl) {
    const a = getAttrVal(fontsEl, "ascii");
    const c = getAttrVal(fontsEl, "cs");
    if (a) out.fontAscii = a;
    if (c) out.fontCs = c;
    if (fontsEl.getAttribute("w:hint") === "cs") out.hintCs = true;
  }

  return out;
}

function extractPPrProps(pPr: Element | null): PPrProps {
  if (!pPr) return {};
  const out: PPrProps = {};

  const jcEl = pPr.querySelector("jc");
  if (jcEl) {
    const a = mapAlignment(getAttrVal(jcEl, "val"));
    if (a) out.alignment = a;
  }

  const indEl = pPr.querySelector("ind");
  if (indEl) {
    const startTwips =
      getAttrVal(indEl, "start") ||
      getAttrVal(indEl, "left") ||
      getAttrVal(indEl, "firstLine") ||
      getAttrVal(indEl, "hanging");
    if (startTwips) {
      const t = parseInt(startTwips, 10);
      if (!isNaN(t)) out.indent = Math.round(t / 20);
    }
  }

  return out;
}

function mergeRPr(child: RPrProps, parent: RPrProps): RPrProps {
  return {
    b: child.b ?? parent.b,
    bCs: child.bCs ?? parent.bCs,
    i: child.i ?? parent.i,
    iCs: child.iCs ?? parent.iCs,
    u: child.u ?? parent.u,
    strike: child.strike ?? parent.strike,
    color: child.color ?? parent.color,
    sz: child.sz ?? parent.sz,
    szCs: child.szCs ?? parent.szCs,
    fontAscii: child.fontAscii ?? parent.fontAscii,
    fontCs: child.fontCs ?? parent.fontCs,
    rtl: child.rtl ?? parent.rtl,
    hintCs: child.hintCs ?? parent.hintCs,
  };
}

function mergePPr(child: PPrProps, parent: PPrProps): PPrProps {
  return {
    alignment: child.alignment ?? parent.alignment,
    indent: child.indent ?? parent.indent,
  };
}

function resolveStyle(
  styleId: string | undefined,
  styleMap: StyleMap,
  visited: Set<string> = new Set(),
): { pPr: PPrProps; rPr: RPrProps } {
  if (!styleId || visited.has(styleId)) return { pPr: {}, rPr: {} };
  const style = styleMap.get(styleId);
  if (!style) return { pPr: {}, rPr: {} };
  visited.add(styleId);
  const parent = resolveStyle(style.basedOn, styleMap, visited);
  return {
    pPr: mergePPr(style.pPr, parent.pPr),
    rPr: mergeRPr(style.rPr, parent.rPr),
  };
}

function rPrToRunProps(props: RPrProps): {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  fontSize?: number;
  fontName?: string;
} {
  const isRtl = props.rtl === true || props.hintCs === true;
  return {
    bold: isRtl ? props.bCs : props.b,
    italic: isRtl ? props.iCs : props.i,
    underline: props.u,
    strikethrough: props.strike,
    color: props.color,
    fontSize: isRtl ? (props.szCs ?? props.sz) : (props.sz ?? props.szCs),
    fontName: isRtl
      ? props.fontCs || props.fontAscii
      : props.fontAscii || props.fontCs,
  };
}

function parseStyles(stylesXml: string): StyleMap {
  const map: StyleMap = new Map();
  if (!stylesXml) return map;
  const parser = new DOMParser();
  const doc = parser.parseFromString(stylesXml, "application/xml");
  doc.querySelectorAll("style").forEach((style) => {
    const styleId = getAttrVal(style, "styleId");
    if (!styleId) return;
    const nameEl = style.querySelector("name");
    const name = nameEl ? getAttrVal(nameEl, "val") : styleId;
    const basedOnEl = style.querySelector("basedOn");
    const basedOn = basedOnEl ? getAttrVal(basedOnEl, "val") : undefined;
    const type = getAttrVal(style, "type");
    const pPr = extractPPrProps(style.querySelector("pPr"));
    const rPr = extractRPrProps(style.querySelector("rPr"));
    map.set(styleId, { name, basedOn: basedOn || undefined, type, pPr, rPr });
  });
  return map;
}

function parseRelationships(relsXml: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!relsXml) return map;
  const parser = new DOMParser();
  const doc = parser.parseFromString(relsXml, "application/xml");
  doc.querySelectorAll("Relationship").forEach((rel) => {
    const id = rel.getAttribute("Id") ?? "";
    const target = rel.getAttribute("Target") ?? "";
    if (id && target) map.set(id, target);
  });
  return map;
}

function parseMetadata(coreXml: string): { title?: string; author?: string } {
  if (!coreXml) return {};
  const parser = new DOMParser();
  const doc = parser.parseFromString(coreXml, "application/xml");
  const titleEl = doc.querySelector("title");
  const authorEl = doc.querySelector("creator");
  return {
    title: titleEl?.textContent?.trim() || undefined,
    author: authorEl?.textContent?.trim() || undefined,
  };
}

const R_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function extractRunsFromContainer(
  container: Element,
  rels: Map<string, string>,
  paragraphRPr: RPrProps,
  styleMap: StyleMap,
): ParsedRun[] {
  const runs: ParsedRun[] = [];
  container.querySelectorAll("r").forEach((r) => {
    const blipEl = r.querySelector("blip");
    if (blipEl) {
      const rEmbed =
        blipEl.getAttribute("r:embed") ??
        blipEl.getAttributeNS(R_NS, "embed") ??
        "";
      if (rEmbed) {
        const target = rels.get(rEmbed);
        if (target) {
          runs.push({ text: "", imageRef: target.split("/").pop() ?? target });
        }
      }
      return;
    }

    const hyperlinkEl = r.closest("hyperlink");
    const rId =
      hyperlinkEl?.getAttribute("r:id") ??
      hyperlinkEl?.getAttributeNS(R_NS, "id") ??
      "";
    const href = rId ? rels.get(rId) : undefined;

    const rPr = r.querySelector("rPr");
    const runDirectProps = extractRPrProps(rPr);

    const rStyleEl = rPr?.querySelector("rStyle");
    const rStyleId = rStyleEl ? getAttrVal(rStyleEl, "val") : undefined;
    const rStyleProps = rStyleId
      ? resolveStyle(rStyleId, styleMap).rPr
      : ({} as RPrProps);

    const effectiveRPr = mergeRPr(
      runDirectProps,
      mergeRPr(rStyleProps, paragraphRPr),
    );
    const runProps = rPrToRunProps(effectiveRPr);

    const footnoteRefEl = r.querySelector("footnoteReference");
    if (footnoteRefEl) {
      const fnId = parseInt(getAttrVal(footnoteRefEl, "id"), 10);
      runs.push({
        text: "",
        footnoteRef: fnId,
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
      });
      return;
    }

    Array.from(r.children).forEach((child) => {
      if (child.localName === "t") {
        const text = child.textContent ?? "";
        if (text) {
          runs.push({
            text,
            bold: runProps.bold,
            italic: runProps.italic,
            underline: runProps.underline,
            strikethrough: runProps.strikethrough,
            color: runProps.color,
            fontSize: runProps.fontSize,
            fontName: runProps.fontName || undefined,
            href,
          });
        }
      } else if (child.localName === "br") {
        const brType = getAttrVal(child as Element, "type");
        if (!brType || brType === "textWrapping") {
          runs.push({ text: "", lineBreak: true });
        }
      }
    });
  });
  return runs;
}

function parseFootnotes(
  footnotesXml: string,
  styleMap: StyleMap,
): Map<number, ParsedFootnote> {
  const map = new Map<number, ParsedFootnote>();
  if (!footnotesXml) return map;
  const parser = new DOMParser();
  const doc = parser.parseFromString(footnotesXml, "application/xml");
  const emptyRels = new Map<string, string>();
  doc.querySelectorAll("footnote").forEach((fn) => {
    const id = parseInt(getAttrVal(fn, "id"), 10);
    if (isNaN(id) || id <= 0) return;
    map.set(id, {
      id,
      runs: extractRunsFromContainer(fn, emptyRels, {}, styleMap),
    });
  });
  return map;
}

function parseDocument(
  documentXml: string,
  styleMap: StyleMap,
  rels: Map<string, string>,
): { paragraphs: ParsedParagraph[]; styleNames: Set<string> } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(documentXml, "application/xml");
  const styleNames = new Set<string>();
  const paragraphs: ParsedParagraph[] = [];

  doc.querySelectorAll("body p").forEach((p) => {
    const pPr = p.querySelector("pPr");
    const pStyleEl = pPr?.querySelector("pStyle");
    const styleId = pStyleEl ? getAttrVal(pStyleEl, "val") : "Normal";
    const resolvedStyle = resolveStyle(styleId, styleMap);
    const styleName = styleMap.get(styleId)?.name ?? styleId;
    styleNames.add(styleName);

    const numPr = pPr?.querySelector("numPr");
    let listInfo: ParsedParagraph["listInfo"] = undefined;
    if (numPr) {
      const ilvlEl = numPr.querySelector("ilvl");
      const level = ilvlEl ? parseInt(getAttrVal(ilvlEl, "val"), 10) : 0;
      listInfo = { level, ordered: false };
    }

    const directPPr = extractPPrProps(pPr ?? null);
    const effectivePPr = mergePPr(directPPr, resolvedStyle.pPr);

    const runs = extractRunsFromContainer(p, rels, resolvedStyle.rPr, styleMap);
    if (runs.length > 0 || styleId !== "Normal") {
      paragraphs.push({
        styleName,
        runs,
        listInfo,
        alignment: effectivePPr.alignment,
        indent: effectivePPr.indent,
      });
    }
  });

  return { paragraphs, styleNames };
}

export async function parseDocx(file: File): Promise<ParsedDocument> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const stylesFile = zip.file("word/styles.xml");
  const documentFile = zip.file("word/document.xml");
  const footnotesFile = zip.file("word/footnotes.xml");
  const relsFile = zip.file("word/_rels/document.xml.rels");
  const coreFile = zip.file("docProps/core.xml");

  if (!documentFile) throw new Error("לא נמצא word/document.xml בקובץ");

  const stylesXml = stylesFile ? await stylesFile.async("string") : "";
  const documentXml = await documentFile.async("string");
  const footnotesXml = footnotesFile ? await footnotesFile.async("string") : "";
  const relsXml = relsFile ? await relsFile.async("string") : "";
  const coreXml = coreFile ? await coreFile.async("string") : "";

  const styleMap = parseStyles(stylesXml);
  const rels = parseRelationships(relsXml);
  const metadata = parseMetadata(coreXml);
  const footnoteMap = parseFootnotes(footnotesXml, styleMap);
  const { paragraphs, styleNames } = parseDocument(documentXml, styleMap, rels);

  const images: ImageData[] = [];
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
  };

  for (const [name, zipEntry] of Object.entries(zip.files)) {
    if (!name.startsWith("word/media/")) continue;
    const ext = name.split(".").pop()?.toLowerCase() ?? "png";
    const base64 = await (zipEntry as JSZip.JSZipObject).async("base64");
    images.push({
      name: name.replace("word/media/", ""),
      base64,
      mimeType: mimeMap[ext] ?? "image/png",
    });
  }

  return {
    styleNames: Array.from(styleNames),
    paragraphs,
    footnotes: Array.from(footnoteMap.values()),
    images,
    title: metadata.title,
    author: metadata.author,
  };
}
