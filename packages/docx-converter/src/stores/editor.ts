import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { isTextFile, languageForPath } from "../services/monaco-setup";

export interface OpenFile {
  path: string; // absolute path
  name: string; // display name (file name)
  relativePath: string; // relative to project root
  language: string;
  content: string;
  savedContent: string; // last persisted version
}

export const useEditorStore = defineStore("editor", () => {
  const openFiles = ref<OpenFile[]>([]);
  const activePath = ref<string | null>(null);

  const activeFile = computed<OpenFile | null>(() => {
    if (!activePath.value) return null;
    return openFiles.value.find((f) => f.path === activePath.value) ?? null;
  });

  function isDirty(file: OpenFile): boolean {
    return file.content !== file.savedContent;
  }

  const hasDirty = computed(() => openFiles.value.some(isDirty));

  async function openFile(
    absPath: string,
    relativePath: string,
  ): Promise<void> {
    if (!window.electron) return;
    if (!isTextFile(absPath)) {
      console.warn("[editor] not a text file:", absPath);
      return;
    }
    const existing = openFiles.value.find((f) => f.path === absPath);
    if (existing) {
      activePath.value = absPath;
      return;
    }
    const raw = await window.electron.fsReadFile(absPath, "utf-8");
    const content =
      typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    const name = absPath.split(/[\\/]/).pop() ?? absPath;
    openFiles.value.push({
      path: absPath,
      name,
      relativePath,
      language: languageForPath(absPath),
      content,
      savedContent: content,
    });
    activePath.value = absPath;
  }

  function setActive(path: string): void {
    activePath.value = path;
  }

  function updateContent(path: string, content: string): void {
    const f = openFiles.value.find((x) => x.path === path);
    if (f) f.content = content;
  }

  async function saveFile(path: string): Promise<void> {
    if (!window.electron) return;
    const f = openFiles.value.find((x) => x.path === path);
    if (!f) return;
    await window.electron.fsWriteFile(path, f.content);
    f.savedContent = f.content;
  }

  async function saveActive(): Promise<void> {
    if (activePath.value) await saveFile(activePath.value);
  }

  async function saveAll(): Promise<void> {
    for (const f of openFiles.value) {
      if (isDirty(f)) await saveFile(f.path);
    }
  }

  function closeFile(path: string): void {
    const idx = openFiles.value.findIndex((f) => f.path === path);
    if (idx === -1) return;
    openFiles.value.splice(idx, 1);
    if (activePath.value === path) {
      activePath.value =
        openFiles.value[idx]?.path ?? openFiles.value[idx - 1]?.path ?? null;
    }
  }

  function closeAll(): void {
    openFiles.value = [];
    activePath.value = null;
  }

  return {
    openFiles,
    activePath,
    activeFile,
    hasDirty,
    isDirty,
    openFile,
    setActive,
    updateContent,
    saveFile,
    saveActive,
    saveAll,
    closeFile,
    closeAll,
  };
});
