import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useEditorStore } from "./editor";

const RECENT_KEY = "vivliostyle-recent-projects";
const MAX_RECENT = 8;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s) => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

function saveRecent(paths: string[]): void {
  localStorage.setItem(RECENT_KEY, JSON.stringify(paths.slice(0, MAX_RECENT)));
}

export const useProjectStore = defineStore("project", () => {
  const rootPath = ref<string | null>(null);
  const tree = ref<FileTreeNode | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const recent = ref<string[]>(loadRecent());

  const isOpen = computed(() => rootPath.value !== null);
  const projectName = computed(() => {
    if (!rootPath.value) return null;
    return (
      rootPath.value.split(/[\\/]/).filter(Boolean).pop() ?? rootPath.value
    );
  });

  async function refreshTree(): Promise<void> {
    if (!rootPath.value || !window.electron) return;
    try {
      tree.value = await window.electron.fsReadDir(rootPath.value);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    }
  }

  function addRecent(path: string): void {
    const next = [path, ...recent.value.filter((p) => p !== path)].slice(
      0,
      MAX_RECENT,
    );
    recent.value = next;
    saveRecent(next);
  }

  async function openProject(path: string): Promise<void> {
    if (!window.electron) {
      error.value = "Electron API not available";
      return;
    }
    isLoading.value = true;
    error.value = null;
    try {
      // close previous project state (unwatch, drop open tabs)
      if (rootPath.value && rootPath.value !== path) {
        useEditorStore().closeAll();
      }
      await window.electron.fsUnwatchDir().catch(() => {});
      rootPath.value = path;
      await refreshTree();
      await window.electron.fsWatchDir(path);
      addRecent(path);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      rootPath.value = null;
      tree.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  async function openProjectDialog(): Promise<void> {
    if (!window.electron) {
      error.value = "Electron API not available";
      return;
    }
    const selected = await window.electron.openDirectory();
    if (selected) {
      await openProject(selected);
    }
  }

  async function closeProject(): Promise<void> {
    if (window.electron) {
      await window.electron.fsUnwatchDir().catch(() => {});
      window.electron.removeProjectListeners();
    }
    useEditorStore().closeAll();
    rootPath.value = null;
    tree.value = null;
  }

  function startWatching(): void {
    if (!window.electron) return;
    window.electron.onDirChanged(() => {
      void refreshTree();
    });
  }

  return {
    rootPath,
    tree,
    isLoading,
    error,
    recent,
    isOpen,
    projectName,
    openProject,
    openProjectDialog,
    closeProject,
    refreshTree,
    startWatching,
  };
});
