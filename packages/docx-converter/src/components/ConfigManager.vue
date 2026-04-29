<template>
  <div class="config-manager">
    <Button
      v-tooltip.bottom="'ייצא קונפיג'"
      icon="pi pi-download"
      severity="secondary"
      size="small"
      text
      @click="store.exportConfig()" />
    <Button
      v-tooltip.bottom="'טען קונפיג'"
      icon="pi pi-upload"
      severity="secondary"
      size="small"
      text
      @click="triggerImport" />
    <Button
      v-tooltip.bottom="'איפוס ברירות מחדל'"
      icon="pi pi-refresh"
      severity="secondary"
      size="small"
      text
      @click="store.resetConfig()" />
    <input
      ref="importInput"
      type="file"
      accept=".json"
      class="hidden-input"
      @change="onImport" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useConverterStore } from "../stores/converter.js";
import type { StyleConfig } from "../types/index.js";
import Button from "primevue/button";

const store = useConverterStore();
const importInput = ref<HTMLInputElement | null>(null);

function triggerImport(): void {
  importInput.value?.click();
}

function onImport(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const config = JSON.parse(ev.target?.result as string) as StyleConfig;
      store.importConfig(config);
    } catch {
      alert("קובץ JSON לא תקין");
    }
  };
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = "";
}
</script>

<style scoped>
.config-manager {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.hidden-input {
  display: none;
}
</style>
