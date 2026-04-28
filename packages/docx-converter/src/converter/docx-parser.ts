import JSZip from "jszip";
import type {
  ParsedDocument,
  ParsedParagraph,
  ParsedRun,
  ParsedFootnote,
  ImageData,
} from "../types/index.js";

function getAttrVal(el: Element, localName: string): string {
  return el.getAttribute(`w:${localName}`) ?? el.getAttribute(localName) ?? "";
}

function parseStyles(stylesXml: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!stylesXml) return map;
  const parser = new DOMParser();
  const doc = parser.parseFromString(stylesXml, "application/xml");
  doc.querySelectorAll("style").forEach((style) => {
    const styleId = getAttrVal(style, "styleId");
    const nameEl = style.querySelector("name");
    const name = nameEl ? getAttrVal(nameEl, "val") : styleId;
    if (styleId && name) map.set(styleId, name);
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

function hasProp(rPr: Element | null | undefined, tagName: string): boolean {
  if (!rPr) return false;
  return (rPr.querySelector as (s: string) => Element | null)(tagName) !== null;
}

const R_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function extractRunsFromContainer(
  container: Element,
  rels: Map<string, string>,
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

    // In OOXML, <w:b> applies to Latin characters and <w:bCs> to Complex Script
    // (Hebrew, Arabic, etc.). RTL runs use the CS properties for bold/italic.
    const isRtl =
      hasProp(rPr, "rtl") ||
      rPr?.querySelector("rFonts")?.getAttribute("w:hint") === "cs";
    const bold = isRtl ? hasProp(rPr, "bCs") : hasProp(rPr, "b");
    const italic = isRtl ? hasProp(rPr, "iCs") : hasProp(rPr, "i");
    const underline = hasProp(rPr, "u");
    const strikethrough = hasProp(rPr, "strike");
    const colorEl = rPr?.querySelector("color");
    const color = colorEl ? getAttrVal(colorEl, "val") : undefined;
    const szEl = rPr?.querySelector("sz");
    const fontSize = szEl
      ? Math.round(parseInt(getAttrVal(szEl, "val"), 10) / 2)
      : undefined;

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

    r.querySelectorAll("t").forEach((t) => {
      const text = t.textContent ?? "";
      if (text) {
        runs.push({
          text,
          bold,
          italic,
          underline,
          strikethrough,
          color: color && color !== "auto" ? color : undefined,
          fontSize,
          href,
        });
      }
    });
  });
  return runs;
}

function parseFootnotes(footnotesXml: string): Map<number, ParsedFootnote> {
  const map = new Map<number, ParsedFootnote>();
  if (!footnotesXml) return map;
  const parser = new DOMParser();
  const doc = parser.parseFromString(footnotesXml, "application/xml");
  const emptyRels = new Map<string, string>();
  doc.querySelectorAll("footnote").forEach((fn) => {
    const id = parseInt(getAttrVal(fn, "id"), 10);
    if (isNaN(id) || id <= 0) return;
    map.set(id, { id, runs: extractRunsFromContainer(fn, emptyRels) });
  });
  return map;
}

function parseDocument(
  documentXml: string,
  styleMap: Map<string, string>,
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
    const styleName = styleMap.get(styleId) ?? styleId;
    styleNames.add(styleName);

    const numPr = pPr?.querySelector("numPr");
    let listInfo: ParsedParagraph["listInfo"] = undefined;
    if (numPr) {
      const ilvlEl = numPr.querySelector("ilvl");
      const level = ilvlEl ? parseInt(getAttrVal(ilvlEl, "val"), 10) : 0;
      listInfo = { level, ordered: false };
    }

    const runs = extractRunsFromContainer(p, rels);
    if (runs.length > 0 || styleId !== "Normal") {
      paragraphs.push({ styleName, runs, listInfo });
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
  const footnoteMap = parseFootnotes(footnotesXml);
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
