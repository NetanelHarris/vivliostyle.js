<template>
  <div class="preview">
    <div class="preview__toolbar">
      <div class="preview__actions">
        <Button
          label="הורד HTML"
          icon="pi pi-file"
          severity="secondary"
          :disabled="!store.hasOutput"
          @click="store.downloadHtml()" />
        <Button
          label="הורד VFM"
          icon="pi pi-file-edit"
          severity="secondary"
          :disabled="!store.hasDocument"
          @click="store.downloadVfm()" />
        <Button
          label="הורד ZIP"
          icon="pi pi-download"
          severity="secondary"
          :disabled="!store.hasDocument"
          @click="store.downloadZip()" />
      </div>
      <div class="preview__dir-toggle">
        <ToggleSwitch v-model="isRtl" inputId="rtl-toggle" />
        <label for="rtl-toggle">RTL</label>
      </div>
    </div>

    <div v-if="!store.hasOutput && !store.hasVfmOutput" class="preview__empty">
      <i class="pi pi-eye-slash preview__empty-icon" />
      <p>העלה קובץ DOCX כדי לראות את התוצאה</p>
    </div>

    <Tabs v-else value="html" class="preview__tabs">
      <TabList>
        <Tab value="html">HTML</Tab>
        <Tab value="vfm">VFM</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="html">
          <iframe
            ref="iframeRef"
            class="preview__frame"
            sandbox="allow-same-origin"
            title="תצוגה מקדימה של HTML" />
        </TabPanel>
        <TabPanel value="vfm">
          <pre
            class="preview__vfm"
            dir="ltr"><code>{{ store.vfmOutput }}</code></pre>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useConverterStore } from "../stores/converter.js";
import Button from "primevue/button";
import ToggleSwitch from "primevue/toggleswitch";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";

const store = useConverterStore();
const iframeRef = ref<HTMLIFrameElement | null>(null);
const isRtl = ref(true);

function applyDir(): void {
  const doc =
    iframeRef.value?.contentDocument ??
    iframeRef.value?.contentWindow?.document;
  if (doc?.documentElement) {
    doc.documentElement.dir = isRtl.value ? "rtl" : "ltr";
  }
}

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
    applyDir();
  },
);

watch(isRtl, applyDir);
</script>

<style scoped>
.preview__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 0.75rem;
}

.preview__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preview__dir-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--p-surface-600);
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
  height: 560px;
  border: 1px solid var(--p-surface-300);
  border-radius: 8px;
  background: white;
}

.preview__vfm {
  width: 100%;
  height: 560px;
  overflow: auto;
  margin: 0;
  padding: 1rem;
  border: 1px solid var(--p-surface-300);
  border-radius: 8px;
  background: var(--p-surface-50);
  font-family: "Courier New", Courier, monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
  color: var(--p-surface-800);
}

.preview__tabs :deep(.p-tabpanels) {
  padding: 0.75rem 0 0;
}
</style>
