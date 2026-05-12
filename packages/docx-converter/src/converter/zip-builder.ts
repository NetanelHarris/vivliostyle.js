import JSZip from "jszip";
import type { ImageData } from "../types/index.js";

export async function buildZip(
  htmlWithExternalImages: string,
  images: ImageData[],
): Promise<Blob> {
  return buildZipMulti(
    [{ filename: "index.html", content: htmlWithExternalImages }],
    images,
  );
}

export async function buildZipMulti(
  files: Array<{ filename: string; content: string }>,
  images: ImageData[],
): Promise<Blob> {
  const zip = new JSZip();

  for (const f of files) {
    zip.file(f.filename, f.content);
  }

  if (images.length > 0) {
    const imgFolder = zip.folder("images");
    if (imgFolder) {
      for (const img of images) {
        imgFolder.file(img.name, img.base64, { base64: true });
      }
    }
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(
  content: string,
  filename: string,
  mimeType = "text/html",
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  downloadBlob(blob, filename);
}
