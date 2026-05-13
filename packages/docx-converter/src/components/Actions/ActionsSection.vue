<template>
  <div class="actions-section">
    <div v-if="!project.isOpen" class="actions-section__empty">
      פתח פרויקט כדי לייצא
    </div>

    <div v-else class="actions-section__body">
      <Fieldset legend="פורמט פלט" :toggleable="true">
        <div class="actions-section__row">
          <label>פורמט</label>
          <Select
            v-model="build.options.format"
            :options="formatOptions"
            option-label="label"
            option-value="value"
            size="small" />
        </div>

        <template v-if="build.options.format === 'pdf'">
          <div class="actions-section__check">
            <Checkbox
              v-model="build.options.cropMarks"
              :binary="true"
              input-id="crop-marks" />
            <label for="crop-marks">סימני חיתוך (Crop marks)</label>
          </div>
          <div v-if="build.options.cropMarks" class="actions-section__row">
            <label>Bleed</label>
            <InputText
              v-model="build.options.bleed"
              size="small"
              placeholder="3mm" />
          </div>
          <div class="actions-section__check">
            <Checkbox
              v-model="build.options.pressReady"
              :binary="true"
              input-id="press-ready" />
            <label for="press-ready">Press-ready PDF/X-1a</label>
          </div>
        </template>
      </Fieldset>

      <Button
        :label="build.isBuilding ? 'מייצא…' : exportLabel"
        :icon="build.isBuilding ? 'pi pi-spin pi-spinner' : 'pi pi-download'"
        :disabled="build.isBuilding"
        size="small"
        class="actions-section__export"
        @click="onExport" />

      <Message
        v-if="build.lastError"
        severity="error"
        :closable="true"
        class="actions-section__error">
        <pre class="actions-section__error-text">{{ build.lastError }}</pre>
      </Message>

      <p class="actions-section__hint">
        <i class="pi pi-info-circle" />
        בייצוא הראשון Vivliostyle יוריד דפדפן headless (Chrome) — עלול לקחת כמה
        דקות.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Fieldset from "primevue/fieldset";
import Select from "primevue/select";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Message from "primevue/message";
import { useToast } from "primevue/usetoast";
import { useProjectStore } from "../../stores/project";
import { useBuildStore } from "../../stores/build";
import { useConfigStore } from "../../stores/config";

const project = useProjectStore();
const build = useBuildStore();
const config = useConfigStore();
const toast = useToast();

const formatOptions = [
  { label: "PDF", value: "pdf" },
  { label: "EPUB", value: "epub" },
  { label: "Web Publication", value: "webpub" },
];

const exportLabel = computed(() => {
  const f = build.options.format.toUpperCase();
  return `יצא ${f}`;
});

function defaultFileName(): string {
  const title = config.data.title?.trim();
  const base = title || project.projectName || "book";
  // Strip illegal filename chars
  const safe = base.replace(/[<>:"/\\|?*]/g, "_");
  const ext =
    build.options.format === "pdf"
      ? "pdf"
      : build.options.format === "epub"
        ? "epub"
        : "zip";
  return `${safe}.${ext}`;
}

function filtersForFormat(): { name: string; extensions: string[] }[] {
  switch (build.options.format) {
    case "pdf":
      return [{ name: "PDF", extensions: ["pdf"] }];
    case "epub":
      return [{ name: "EPUB", extensions: ["epub"] }];
    case "webpub":
      return [{ name: "Web Publication (zip)", extensions: ["zip"] }];
  }
}

async function onExport(): Promise<void> {
  if (!window.electron || !project.rootPath) return;
  const defaultPath = `${project.rootPath.replace(/[\\/]$/, "")}/${defaultFileName()}`;
  const outputPath = await window.electron.saveAs({
    defaultPath,
    filters: filtersForFormat(),
  });
  if (!outputPath) return;

  toast.add({
    severity: "info",
    summary: "ייצוא התחיל",
    detail: outputPath,
    life: 2500,
  });

  const result = await build.exportTo(project.rootPath, outputPath);

  if (result.ok) {
    toast.add({
      severity: "success",
      summary: "ייצוא הושלם",
      detail: outputPath,
      life: 4000,
    });
  } else {
    toast.add({
      severity: "error",
      summary: "ייצוא נכשל",
      detail: result.error ?? "ראה לוגים",
      life: 6000,
    });
  }
}
</script>

<style scoped>
.actions-section {
  padding: 0.25rem;
}

.actions-section__empty {
  padding: 1rem;
  text-align: center;
  color: var(--p-surface-500);
  font-size: 0.9rem;
}

.actions-section__body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.actions-section :deep(.p-fieldset-legend) {
  font-size: 0.85rem;
  font-weight: 600;
}

.actions-section :deep(.p-fieldset-content) {
  padding: 0.5rem;
}

.actions-section__row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.5rem;
}

.actions-section__row label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--p-surface-700);
}

.actions-section__row :deep(.p-inputtext),
.actions-section__row :deep(.p-select) {
  width: 100%;
  font-size: 0.85rem;
}

.actions-section__check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
}

.actions-section__check label {
  cursor: pointer;
}

.actions-section__export {
  width: 100%;
}

.actions-section__error {
  margin-top: 0.5rem;
}

.actions-section__error-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, monospace;
  font-size: 0.75rem;
}

.actions-section__hint {
  font-size: 0.75rem;
  color: var(--p-surface-500);
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0.5rem 0 0;
}
</style>
