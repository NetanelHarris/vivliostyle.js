import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  parseConfig,
  serializeConfig,
  type ConfigData,
  type ConfigEntry,
} from "../services/config-codec";

const CONFIG_NAMES = [
  "vivliostyle.config.js",
  "vivliostyle.config.mjs",
  "vivliostyle.config.cjs",
  "vivliostyle.config.json",
];

function emptyConfig(): ConfigData {
  return { unknownKeys: [] };
}

export const useConfigStore = defineStore("config", () => {
  const filePath = ref<string | null>(null);
  const source = ref<string>("");
  const data = ref<ConfigData>(emptyConfig());
  const savedData = ref<ConfigData>(emptyConfig());
  const error = ref<string | null>(null);
  const isLoading = ref(false);

  const hasConfig = computed(() => filePath.value !== null);
  const isDirty = computed(
    () => JSON.stringify(data.value) !== JSON.stringify(savedData.value),
  );

  async function findConfigInProject(
    projectDir: string,
  ): Promise<string | null> {
    if (!window.electron) return null;
    for (const name of CONFIG_NAMES) {
      const candidate = `${projectDir.replace(/[\\/]$/, "")}/${name}`;
      if (await window.electron.fsExists(candidate)) return candidate;
    }
    return null;
  }

  async function load(projectDir: string): Promise<void> {
    if (!window.electron) {
      error.value = "Electron API not available";
      return;
    }
    isLoading.value = true;
    error.value = null;
    try {
      const path = await findConfigInProject(projectDir);
      if (!path) {
        filePath.value = null;
        source.value = "";
        data.value = emptyConfig();
        savedData.value = emptyConfig();
        return;
      }
      filePath.value = path;
      const raw = await window.electron.fsReadFile(path, "utf-8");
      const text =
        typeof raw === "string" ? raw : new TextDecoder().decode(raw);
      source.value = text;
      data.value = await parseConfig(text);
      savedData.value = JSON.parse(JSON.stringify(data.value));
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading.value = false;
    }
  }

  async function save(): Promise<void> {
    if (!window.electron) return;
    if (!filePath.value) return;
    try {
      const next = await serializeConfig(source.value, data.value);
      await window.electron.fsWriteFile(filePath.value, next);
      source.value = next;
      savedData.value = JSON.parse(JSON.stringify(data.value));
      error.value = null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  async function createDefault(projectDir: string): Promise<void> {
    if (!window.electron) return;
    const path = `${projectDir.replace(/[\\/]$/, "")}/vivliostyle.config.js`;
    const defaultData: ConfigData = {
      title: "Untitled",
      language: "he",
      readingProgression: "rtl",
      size: "A5",
      entry: [],
      unknownKeys: [],
    };
    const text = await serializeConfig("", defaultData);
    // Prepend a defineConfig import for IDE support.
    const finalText =
      `import { defineConfig } from "@vivliostyle/cli";\n\n` +
      text.replace(
        /^export default (\{[\s\S]*\})/m,
        "export default defineConfig($1)",
      );
    await window.electron.fsWriteFile(path, finalText);
    await load(projectDir);
  }

  /**
   * Add an entry to the in-memory config (does not persist; user must save).
   * If an entry with the same path already exists, it's replaced.
   */
  function addEntry(entry: ConfigEntry): void {
    const list = [...(data.value.entry ?? [])];
    const idx = list.findIndex((e) => e.path === entry.path);
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    data.value = { ...data.value, entry: list };
  }

  function reset(): void {
    filePath.value = null;
    source.value = "";
    data.value = emptyConfig();
    savedData.value = emptyConfig();
    error.value = null;
  }

  return {
    filePath,
    source,
    data,
    error,
    isLoading,
    hasConfig,
    isDirty,
    load,
    save,
    createDefault,
    reset,
    addEntry,
  };
});
