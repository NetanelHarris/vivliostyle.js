<template>
  <div class="preview">
    <div class="preview__toolbar">
      <h3 class="preview__title">תצוגה מקדימה</h3>
      <div class="preview__actions">
        <Button
          label="המר"
          icon="pi pi-bolt"
          :disabled="!store.hasDocument"
          @click="store.convert()" />
        <Button
          label="הורד HTML"
          icon="pi pi-file"
          severity="secondary"
          :disabled="!store.hasOutput"
          @click="store.downloadHtml()" />
        <Button
          label="הורד ZIP"
          icon="pi pi-download"
          severity="secondary"
          :disabled="!store.hasDocument"
          @click="store.downloadZip()" />
      </div>
    </div>

    <div v-if="!store.hasOutput" class="preview__empty">
      <i class="pi pi-eye-slash preview__empty-icon" />
      <p>לחץ "המר" כדי לראות את התוצאה</p>
    </div>

    <iframe
      v-else
      ref="iframeRef"
      class="preview__frame"
      sandbox="allow-same-origin"
      title="תצוגה מקדימה של HTML" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useConverterStore } from "../stores/converter.js";
import Button from "primevue/button";

const store = useConverterStore();
const iframeRef = ref<HTMLIFrameElement | null>(null);

watch(
  () => store.htmlOutput,
  async (html) => {
    if (!html) return;
    await nextTick();
    const iframe = iframeRef.value;
    if (!iframe) return;
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  },
);
</script>

<style scoped>
.preview__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.preview__title {
  margin: 0;
  font-size: 1.1rem;
}

.preview__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preview__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 200px;
  color: var(--p-surface-400);
  border: 1px dashed var(--p-surface-300);
  border-radius: 8px;
}

.preview__empty-icon {
  font-size: 2.5rem;
}

.preview__frame {
  width: 100%;
  height: 600px;
  border: 1px solid var(--p-surface-300);
  border-radius: 8px;
  background: white;
}
</style>
