import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  ParsedDocument,
  StyleConfig,
  FullConfig,
  MappingRule,
  MappingCondition,
} from "../types/index.js";
import { DEFAULT_STYLE_MAPPINGS, STORAGE_KEY } from "../types/index.js";
import { parseDocx } from "../converter/docx-parser.js";
import {
  generateHtmlFiles,
  generateHtmlWithEmbeddedImages,
  generateHtmlWithExternalImages,
} from "../converter/html-generator.js";
import { generateVfm } from "../converter/vfm-generator.js";
import {
  buildZip,
  buildZipMulti,
  downloadBlob,
  downloadText,
} from "../converter/zip-builder.js";

interface PersistedConfig {
  styleConfig: StyleConfig;
  rules: MappingRule[];
}

function isLegacyConfig(raw: unknown): raw is StyleConfig {
  if (!raw || typeof raw !== "object") return false;
  if ("styleConfig" in raw && "rules" in raw) return false;
  for (const v of Object.values(raw as Record<string, unknown>)) {
    if (v && typeof v === "object" && "tag" in (v as object)) return true;
  }
  return Object.keys(raw as object).length === 0;
}

function loadConfigFromStorage(): PersistedConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isLegacyConfig(parsed)) {
        return { styleConfig: parsed as StyleConfig, rules: [] };
      }
      if (parsed && typeof parsed === "object" && "styleConfig" in parsed) {
        const p = parsed as Partial<FullConfig>;
        return {
          styleConfig: p.styleConfig ?? { ...DEFAULT_STYLE_MAPPINGS },
          rules: Array.isArray(p.rules) ? p.rules : [],
        };
      }
    }
  } catch {
    // ignore
  }
  return { styleConfig: { ...DEFAULT_STYLE_MAPPINGS }, rules: [] };
}

function saveConfigToStorage(config: PersistedConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

function generateId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyCondition(scope: "paragraph" | "run"): MappingCondition {
  return { scope };
}

export const useConverterStore = defineStore("converter", () => {
  const initial = loadConfigFromStorage();
  const file = ref<File | null>(null);
  const parsedDoc = ref<ParsedDocument | null>(null);
  const styleConfig = ref<StyleConfig>(initial.styleConfig);
  const rules = ref<MappingRule[]>(initial.rules);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const includeColors = ref(false);
  const includeFontSizes = ref(false);

  const hasDocument = computed(() => parsedDoc.value !== null);

  const htmlOutput = computed<string>(() => {
    if (!parsedDoc.value) return "";
    return generateHtmlWithEmbeddedImages(parsedDoc.value, styleConfig.value, {
      includeColors: includeColors.value,
      includeFontSizes: includeFontSizes.value,
      rules: rules.value,
    });
  });

  const vfmOutput = computed<string>(() => {
    if (!parsedDoc.value) return "";
    return generateVfm(parsedDoc.value, styleConfig.value);
  });

  const hasOutput = computed(() => htmlOutput.value !== "");
  const hasVfmOutput = computed(() => vfmOutput.value !== "");
  const styleNames = computed(() => parsedDoc.value?.styleNames ?? []);
  const allMappingsEnabled = computed(() =>
    styleNames.value.every((n) => styleConfig.value[n]?.enabled !== false),
  );

  const observedFontNames = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of parsedDoc.value?.paragraphs ?? []) {
      for (const r of p.runs) if (r.fontName) set.add(r.fontName);
    }
    return Array.from(set).sort();
  });

  const observedFontSizes = computed<number[]>(() => {
    const set = new Set<number>();
    for (const p of parsedDoc.value?.paragraphs ?? []) {
      for (const r of p.runs) if (r.fontSize) set.add(r.fontSize);
    }
    return Array.from(set).sort((a, b) => a - b);
  });

  const observedColors = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of parsedDoc.value?.paragraphs ?? []) {
      for (const r of p.runs) if (r.color) set.add(r.color.toUpperCase());
    }
    return Array.from(set).sort();
  });

  const observedAlignments = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of parsedDoc.value?.paragraphs ?? []) {
      if (p.alignment) set.add(p.alignment);
    }
    return Array.from(set).sort();
  });

  const observedIndents = computed<number[]>(() => {
    const set = new Set<number>();
    for (const p of parsedDoc.value?.paragraphs ?? []) {
      if (p.indent !== undefined) set.add(p.indent);
    }
    return Array.from(set).sort((a, b) => a - b);
  });

  function persist(): void {
    saveConfigToStorage({ styleConfig: styleConfig.value, rules: rules.value });
  }

  function ensureStylesForDoc(names: string[]): void {
    for (const name of names) {
      if (!(name in styleConfig.value)) {
        styleConfig.value[name] = DEFAULT_STYLE_MAPPINGS[name] ?? {
          tag: "p",
          class: name.toLowerCase().replace(/\s+/g, "-"),
        };
      }
    }
    persist();
  }

  async function loadFile(f: File): Promise<void> {
    file.value = f;
    parsedDoc.value = null;
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

  function setAllMappingsEnabled(v: boolean): void {
    for (const name of styleNames.value) {
      styleConfig.value[name] = { ...styleConfig.value[name], enabled: v };
    }
    persist();
  }

  function updateMapping(
    styleName: string,
    mapping: {
      tag?: string;
      class?: string;
      enabled?: boolean;
      debug?: boolean;
      hidden?: boolean;
    },
  ): void {
    styleConfig.value[styleName] = {
      ...styleConfig.value[styleName],
      ...mapping,
    };
    persist();
  }

  function addRule(scope: "paragraph" | "run" = "paragraph"): MappingRule {
    const rule: MappingRule = {
      id: generateId(),
      name: scope === "paragraph" ? "כלל פיסקה" : "כלל run",
      enabled: true,
      condition: emptyCondition(scope),
      output: { tag: scope === "paragraph" ? "p" : "span", class: "" },
    };
    rules.value.push(rule);
    persist();
    return rule;
  }

  function updateRule(id: string, patch: Partial<MappingRule>): void {
    const idx = rules.value.findIndex((r) => r.id === id);
    if (idx === -1) return;
    rules.value[idx] = { ...rules.value[idx], ...patch };
    persist();
  }

  function updateRuleCondition(
    id: string,
    patch: Partial<MappingCondition>,
  ): void {
    const idx = rules.value.findIndex((r) => r.id === id);
    if (idx === -1) return;
    rules.value[idx] = {
      ...rules.value[idx],
      condition: { ...rules.value[idx].condition, ...patch },
    };
    persist();
  }

  function updateRuleOutput(
    id: string,
    patch: Partial<{
      tag: string;
      class: string;
      debug: boolean;
      hidden: boolean;
      splitFile: boolean;
    }>,
  ): void {
    const idx = rules.value.findIndex((r) => r.id === id);
    if (idx === -1) return;
    rules.value[idx] = {
      ...rules.value[idx],
      output: { ...rules.value[idx].output, ...patch },
    };
    persist();
  }

  function removeRule(id: string): void {
    rules.value = rules.value.filter((r) => r.id !== id);
    persist();
  }

  function moveRule(id: string, direction: -1 | 1): void {
    const idx = rules.value.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const target = idx + direction;
    if (target < 0 || target >= rules.value.length) return;
    const copy = rules.value.slice();
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    rules.value = copy;
    persist();
  }

  function downloadHtml(): void {
    if (!htmlOutput.value) return;
    downloadText(htmlOutput.value, "output.html");
  }

  function downloadVfm(): void {
    if (!parsedDoc.value) return;
    downloadText(vfmOutput.value, "output.md", "text/markdown");
  }

  const hasSplitRule = computed<boolean>(() =>
    rules.value.some(
      (r) =>
        r.enabled &&
        r.condition.scope === "paragraph" &&
        r.output.splitFile === true &&
        !r.output.hidden,
    ),
  );

  const previewFiles = computed<{ filename: string; html: string }[]>(() => {
    if (!parsedDoc.value) return [];
    if (!hasSplitRule.value) {
      return [{ filename: "index.html", html: htmlOutput.value }];
    }
    return generateHtmlFiles(parsedDoc.value, styleConfig.value, {
      includeColors: includeColors.value,
      includeFontSizes: includeFontSizes.value,
      rules: rules.value,
      embedImages: true,
    });
  });

  const splitFileCount = computed<number>(() =>
    hasSplitRule.value ? previewFiles.value.length : 0,
  );

  async function downloadZip(): Promise<void> {
    if (!parsedDoc.value) return;
    const opts = {
      includeColors: includeColors.value,
      includeFontSizes: includeFontSizes.value,
      rules: rules.value,
      embedImages: false,
    };
    if (splitFileCount.value > 0) {
      const files = generateHtmlFiles(
        parsedDoc.value,
        styleConfig.value,
        opts,
      ).map((f) => ({ filename: f.filename, content: f.html }));
      const blob = await buildZipMulti(files, parsedDoc.value.images);
      downloadBlob(blob, "output.zip");
      return;
    }
    const htmlExternal = generateHtmlWithExternalImages(
      parsedDoc.value,
      styleConfig.value,
      opts,
    );
    const blob = await buildZip(htmlExternal, parsedDoc.value.images);
    downloadBlob(blob, "output.zip");
  }

  function exportConfig(): void {
    const payload: FullConfig = {
      styleConfig: styleConfig.value,
      rules: rules.value,
    };
    downloadText(
      JSON.stringify(payload, null, 2),
      "docx-style-config.json",
      "application/json",
    );
  }

  function importConfig(config: StyleConfig | FullConfig): void {
    if (isLegacyConfig(config)) {
      styleConfig.value = { ...styleConfig.value, ...(config as StyleConfig) };
    } else {
      const full = config as FullConfig;
      if (full.styleConfig) {
        styleConfig.value = { ...styleConfig.value, ...full.styleConfig };
      }
      if (Array.isArray(full.rules)) {
        rules.value = full.rules;
      }
    }
    persist();
  }

  function resetConfig(): void {
    styleConfig.value = { ...DEFAULT_STYLE_MAPPINGS };
    rules.value = [];
    if (parsedDoc.value) ensureStylesForDoc(parsedDoc.value.styleNames);
    else persist();
  }

  return {
    file,
    parsedDoc,
    styleConfig,
    rules,
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
    allMappingsEnabled,
    observedFontNames,
    observedFontSizes,
    observedColors,
    observedAlignments,
    observedIndents,
    splitFileCount,
    previewFiles,
    loadFile,
    setAllMappingsEnabled,
    updateMapping,
    addRule,
    updateRule,
    updateRuleCondition,
    updateRuleOutput,
    removeRule,
    moveRule,
    downloadHtml,
    downloadVfm,
    downloadZip,
    exportConfig,
    importConfig,
    resetConfig,
  };
});
