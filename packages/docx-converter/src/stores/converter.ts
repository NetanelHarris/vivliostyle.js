import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { ParsedDocument, StyleConfig } from "../types/index.js";
import { DEFAULT_STYLE_MAPPINGS, STORAGE_KEY } from "../types/index.js";
import { parseDocx } from "../converter/docx-parser.js";
import {
  generateHtmlWithEmbeddedImages,
  generateHtmlWithExternalImages,
} from "../converter/html-generator.js";
import { generateVfm } from "../converter/vfm-generator.js";
import {
  buildZip,
  downloadBlob,
  downloadText,
} from "../converter/zip-builder.js";

function loadConfigFromStorage(): StyleConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StyleConfig;
  } catch {
    // ignore
  }
  return { ...DEFAULT_STYLE_MAPPINGS };
}

function saveConfigToStorage(config: StyleConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export const useConverterStore = defineStore("converter", () => {
  const file = ref<File | null>(null);
  const parsedDoc = ref<ParsedDocument | null>(null);
  const styleConfig = ref<StyleConfig>(loadConfigFromStorage());
  const htmlOutput = ref<string>("");
  const vfmOutput = ref<string>("");
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const includeColors = ref(false);
  const includeFontSizes = ref(false);

  const hasDocument = computed(() => parsedDoc.value !== null);
  const hasOutput = computed(() => htmlOutput.value !== "");
  const hasVfmOutput = computed(() => vfmOutput.value !== "");
  const styleNames = computed(() => parsedDoc.value?.styleNames ?? []);

  function ensureStylesForDoc(names: string[]): void {
    for (const name of names) {
      if (!(name in styleConfig.value)) {
        styleConfig.value[name] = DEFAULT_STYLE_MAPPINGS[name] ?? {
          tag: "p",
          class: name.toLowerCase().replace(/\s+/g, "-"),
        };
      }
    }
    saveConfigToStorage(styleConfig.value);
  }

  async function loadFile(f: File): Promise<void> {
    file.value = f;
    parsedDoc.value = null;
    htmlOutput.value = "";
    vfmOutput.value = "";
    error.value = null;
    isLoading.value = true;
    try {
      const doc = await parseDocx(f);
      parsedDoc.value = doc;
      ensureStylesForDoc(doc.styleNames);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "שגיאה לא ידועה";
    } finally {
      isLoading.value = false;
    }
  }

  function convert(): void {
    if (!parsedDoc.value) return;
    const opts = {
      includeColors: includeColors.value,
      includeFontSizes: includeFontSizes.value,
    };
    htmlOutput.value = generateHtmlWithEmbeddedImages(
      parsedDoc.value,
      styleConfig.value,
      opts,
    );
    vfmOutput.value = generateVfm(parsedDoc.value, styleConfig.value);
  }

  function updateMapping(
    styleName: string,
    mapping: { tag?: string; class?: string },
  ): void {
    styleConfig.value[styleName] = {
      ...styleConfig.value[styleName],
      ...mapping,
    };
    saveConfigToStorage(styleConfig.value);
  }

  function downloadHtml(): void {
    if (!htmlOutput.value) return;
    downloadText(htmlOutput.value, "output.html");
  }

  function downloadVfm(): void {
    if (!parsedDoc.value) return;
    const content =
      vfmOutput.value || generateVfm(parsedDoc.value, styleConfig.value);
    downloadText(content, "output.md", "text/markdown");
  }

  async function downloadZip(): Promise<void> {
    if (!parsedDoc.value) return;
    const opts = {
      includeColors: includeColors.value,
      includeFontSizes: includeFontSizes.value,
    };
    const htmlExternal = generateHtmlWithExternalImages(
      parsedDoc.value,
      styleConfig.value,
      opts,
    );
    const blob = await buildZip(htmlExternal, parsedDoc.value.images);
    downloadBlob(blob, "output.zip");
  }

  function exportConfig(): void {
    downloadText(
      JSON.stringify(styleConfig.value, null, 2),
      "docx-style-config.json",
      "application/json",
    );
  }

  function importConfig(config: StyleConfig): void {
    styleConfig.value = { ...styleConfig.value, ...config };
    saveConfigToStorage(styleConfig.value);
  }

  function resetConfig(): void {
    styleConfig.value = { ...DEFAULT_STYLE_MAPPINGS };
    if (parsedDoc.value) ensureStylesForDoc(parsedDoc.value.styleNames);
    else saveConfigToStorage(styleConfig.value);
  }

  return {
    file,
    parsedDoc,
    styleConfig,
    htmlOutput,
    vfmOutput,
    isLoading,
    error,
    includeColors,
    includeFontSizes,
    hasDocument,
    hasOutput,
    hasVfmOutput,
    styleNames,
    loadFile,
    convert,
    updateMapping,
    downloadHtml,
    downloadVfm,
    downloadZip,
    exportConfig,
    importConfig,
    resetConfig,
  };
});
