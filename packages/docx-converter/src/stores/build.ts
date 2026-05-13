import { defineStore } from "pinia";
import { ref } from "vue";

export interface BuildOptions {
  format: "pdf" | "epub" | "webpub";
  cropMarks: boolean;
  bleed: string; // e.g. "3mm" — empty = default
  pressReady: boolean;
}

export const useBuildStore = defineStore("build", () => {
  const isBuilding = ref(false);
  const lastError = ref<string | null>(null);
  const options = ref<BuildOptions>({
    format: "pdf",
    cropMarks: false,
    bleed: "",
    pressReady: false,
  });

  function buildArgs(): string[] {
    const args: string[] = ["-f", options.value.format];
    if (options.value.format === "pdf") {
      if (options.value.cropMarks) args.push("--crop-marks");
      if (options.value.bleed.trim())
        args.push("--bleed", options.value.bleed.trim());
      if (options.value.pressReady) args.push("--press-ready");
    }
    return args;
  }

  async function exportTo(
    projectDir: string,
    outputPath: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!window.electron) return { ok: false, error: "No electron API" };
    isBuilding.value = true;
    lastError.value = null;
    try {
      const result = await window.electron.vivBuild(
        projectDir,
        outputPath,
        buildArgs(),
      );
      if (result.code === 0) {
        return { ok: true };
      }
      lastError.value = result.error ?? `exit code ${result.code}`;
      return { ok: false, error: lastError.value };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      lastError.value = err;
      return { ok: false, error: err };
    } finally {
      isBuilding.value = false;
    }
  }

  return {
    isBuilding,
    lastError,
    options,
    exportTo,
  };
});
