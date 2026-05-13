<template>
  <div class="settings-section">
    <div v-if="!project.isOpen" class="settings-section__empty">
      פתח פרויקט כדי לערוך הגדרות
    </div>

    <div v-else-if="!config.hasConfig" class="settings-section__empty">
      <p>הפרויקט לא מכיל <code>vivliostyle.config.js</code></p>
      <Button
        label="צור config ברירת מחדל"
        icon="pi pi-plus"
        size="small"
        @click="onCreateDefault" />
    </div>

    <div v-else class="settings-section__body">
      <div class="settings-section__toolbar">
        <Button
          :label="config.isDirty ? 'שמור שינויים' : 'נשמר'"
          icon="pi pi-save"
          size="small"
          :severity="config.isDirty ? 'primary' : 'secondary'"
          :disabled="!config.isDirty"
          @click="onSave" />
        <Button
          icon="pi pi-refresh"
          severity="secondary"
          size="small"
          text
          v-tooltip.bottom="'טען מחדש מקובץ'"
          @click="onReload" />
      </div>

      <Message
        v-if="config.error"
        severity="error"
        :closable="false"
        class="settings-section__error">
        {{ config.error }}
      </Message>

      <ConfigForm :data="config.data" @update:data="config.data = $event" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import Button from "primevue/button";
import Message from "primevue/message";
import { useProjectStore } from "../../stores/project";
import { useConfigStore } from "../../stores/config";
import { useToast } from "primevue/usetoast";
import ConfigForm from "./ConfigForm.vue";

const project = useProjectStore();
const config = useConfigStore();
const toast = useToast();

watch(
  () => project.rootPath,
  (path) => {
    if (path) {
      void config.load(path);
    } else {
      config.reset();
    }
  },
  { immediate: true },
);

async function onSave(): Promise<void> {
  try {
    await config.save();
    toast.add({
      severity: "success",
      summary: "הגדרות נשמרו",
      life: 1500,
    });
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "שגיאת שמירה",
      detail: e instanceof Error ? e.message : String(e),
      life: 4000,
    });
  }
}

async function onReload(): Promise<void> {
  if (project.rootPath) {
    await config.load(project.rootPath);
    toast.add({
      severity: "info",
      summary: "טופס נטען מחדש מהקובץ",
      life: 1500,
    });
  }
}

async function onCreateDefault(): Promise<void> {
  if (!project.rootPath) return;
  try {
    await config.createDefault(project.rootPath);
    toast.add({
      severity: "success",
      summary: "vivliostyle.config.js נוצר",
      life: 1500,
    });
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "שגיאה ביצירת קובץ",
      detail: e instanceof Error ? e.message : String(e),
      life: 4000,
    });
  }
}
</script>

<style scoped>
.settings-section {
  padding: 0.25rem;
}

.settings-section__empty {
  padding: 1rem;
  text-align: center;
  color: var(--p-surface-500);
  font-size: 0.9rem;
}

.settings-section__empty code {
  font-family: Consolas, monospace;
  background: var(--p-surface-200);
  padding: 1px 4px;
  border-radius: 2px;
}

.settings-section__empty p {
  margin: 0 0 0.75rem;
}

.settings-section__toolbar {
  display: flex;
  gap: 0.4rem;
  padding: 0.5rem;
  border-block-end: 1px solid var(--p-surface-200);
  background: var(--p-surface-50);
  position: sticky;
  top: 0;
  z-index: 1;
}

.settings-section__error {
  margin: 0.5rem;
}
</style>
