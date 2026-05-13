<template>
  <div class="preview-panel">
    <div class="preview-panel__toolbar">
      <Button
        v-if="!preview.isRunning"
        :loading="preview.isStarting"
        :disabled="!project.isOpen"
        icon="pi pi-play"
        label="הפעל תצוגה"
        size="small"
        @click="onStart" />
      <Button
        v-else
        icon="pi pi-stop"
        label="עצור"
        severity="secondary"
        size="small"
        @click="preview.stop()" />
      <Button
        v-if="preview.isRunning"
        icon="pi pi-refresh"
        severity="secondary"
        size="small"
        text
        @click="preview.reload()" />
      <span v-if="preview.isRunning" class="preview-panel__status">
        port {{ preview.port }}
      </span>
    </div>

    <div class="preview-panel__body">
      <iframe
        v-if="preview.url"
        :key="preview.iframeKey"
        :src="preview.url"
        class="preview-panel__iframe" />
      <div v-else class="preview-panel__placeholder">
        <i class="pi pi-eye" />
        <h2>תצוגה מקדימה</h2>
        <p v-if="!project.isOpen">פתח פרויקט כדי להפעיל תצוגה</p>
        <p v-else>לחץ "הפעל תצוגה" כדי להריץ vivliostyle preview</p>
        <Message
          v-if="preview.error"
          severity="error"
          :closable="false"
          class="preview-panel__error">
          <pre class="preview-panel__error-text">{{ preview.error }}</pre>
        </Message>
        <Button
          v-if="preview.logs.length"
          :label="
            showLogs ? 'הסתר לוגים' : `הצג לוגים (${preview.logs.length})`
          "
          severity="secondary"
          text
          size="small"
          class="preview-panel__logs-toggle"
          @click="showLogs = !showLogs" />
        <div v-if="showLogs && preview.logs.length" class="preview-panel__logs">
          <div
            v-for="(log, i) in preview.logs"
            :key="i"
            class="preview-panel__log"
            :class="`preview-panel__log--${log.stream}`">
            {{ log.text }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import Button from "primevue/button";
import Message from "primevue/message";
import { useProjectStore } from "../../stores/project";
import { usePreviewStore } from "../../stores/preview";

const project = useProjectStore();
const preview = usePreviewStore();
const showLogs = ref(false);

watch(
  () => preview.error,
  (err) => {
    if (err) showLogs.value = true;
  },
);

onMounted(() => {
  preview.startListening();
});

onBeforeUnmount(() => {
  preview.stopListening();
  void preview.stop();
});

async function onStart(): Promise<void> {
  if (!project.rootPath) return;
  await preview.start(project.rootPath);
}
</script>

<style scoped>
.preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--p-surface-100);
  border-inline-start: 1px solid var(--p-surface-200);
  overflow: hidden;
}

.preview-panel__toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--p-surface-50);
  border-block-end: 1px solid var(--p-surface-200);
  flex-shrink: 0;
}

.preview-panel__status {
  font-size: 0.8rem;
  color: var(--p-surface-500);
  margin-inline-start: auto;
}

.preview-panel__body {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.preview-panel__iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.preview-panel__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--p-surface-500);
  text-align: center;
  padding: 1rem;
}

.preview-panel__placeholder i {
  font-size: 3rem;
  opacity: 0.3;
}

.preview-panel__error {
  margin-top: 1rem;
  max-width: 90%;
  width: 90%;
  text-align: start;
}

.preview-panel__error-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 0.85rem;
}

.preview-panel__logs-toggle {
  margin-top: 0.5rem;
}

.preview-panel__logs {
  width: 90%;
  max-height: 250px;
  overflow-y: auto;
  background: var(--p-surface-900);
  color: var(--p-surface-100);
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.75rem;
  padding: 0.5rem;
  border-radius: 4px;
  margin-top: 0.5rem;
  direction: ltr;
  text-align: left;
}

.preview-panel__log {
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-panel__log--stderr {
  color: var(--p-red-300);
}
</style>
