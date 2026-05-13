import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { isDetachedWindow } from "../utils/window-mode";

export interface LogEntry {
  stream: "stdout" | "stderr";
  text: string;
  ts: number;
}

const MAX_LOGS = 500;

export const usePreviewStore = defineStore("preview", () => {
  const port = ref<number | null>(null);
  const url = ref<string | null>(null);
  const isStarting = ref(false);
  const error = ref<string | null>(null);
  const iframeKey = ref(0);
  const logs = ref<LogEntry[]>([]);

  const isRunning = computed(() => url.value !== null);

  function appendLog(stream: "stdout" | "stderr", text: string): void {
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    for (const line of lines) {
      logs.value.push({ stream, text: line, ts: Date.now() });
    }
    if (logs.value.length > MAX_LOGS) {
      logs.value.splice(0, logs.value.length - MAX_LOGS);
    }
  }

  function clearLogs(): void {
    logs.value = [];
  }

  async function start(projectDir: string): Promise<void> {
    if (!window.electron) {
      error.value = "Electron API not available";
      return;
    }
    isStarting.value = true;
    error.value = null;
    try {
      const result = await window.electron.vivPreviewStart(projectDir);
      port.value = result.port;
      url.value = result.url;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      port.value = null;
      url.value = null;
    } finally {
      isStarting.value = false;
    }
  }

  async function stop(): Promise<void> {
    if (!window.electron) return;
    await window.electron.vivPreviewStop().catch(() => {});
    port.value = null;
    url.value = null;
  }

  function reload(): void {
    iframeKey.value++;
  }

  function setFromStatus(newPort: number | null, newUrl: string): void {
    port.value = newPort;
    url.value = newUrl;
    iframeKey.value++;
  }

  function startListening(): void {
    if (!window.electron) return;
    window.electron.onVivLog(({ stream, text }) => {
      appendLog(stream, text);
    });
    window.electron.onVivPreviewExit(({ code }) => {
      appendLog("stderr", `[preview exited with code ${code}]`);
      port.value = null;
      url.value = null;
    });
    if (!isDetachedWindow()) {
      watch(url, (newUrl) => {
        if (newUrl) {
          void window.electron?.notifyPreviewUrl(newUrl);
        }
      });
    }
  }

  function stopListening(): void {
    window.electron?.removeVivListeners();
  }

  return {
    port,
    url,
    isStarting,
    isRunning,
    error,
    iframeKey,
    logs,
    start,
    stop,
    reload,
    clearLogs,
    setFromStatus,
    startListening,
    stopListening,
  };
});
