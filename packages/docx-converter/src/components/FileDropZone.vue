<template>
  <div
    class="drop-zone"
    :class="{ 'drop-zone--active': isDragging, 'drop-zone--loaded': hasFile }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop">
    <div v-if="!hasFile" class="drop-zone__content">
      <i class="pi pi-file-word drop-zone__icon" />
      <p class="drop-zone__text">גרור קובץ DOCX לכאן</p>
      <p class="drop-zone__sub">או</p>
      <Button label="בחר קובץ" icon="pi pi-upload" @click="triggerInput" />
      <input
        ref="fileInput"
        type="file"
        accept=".docx"
        class="drop-zone__input"
        @change="onInputChange" />
    </div>
    <div v-else class="drop-zone__loaded">
      <i class="pi pi-check-circle drop-zone__icon drop-zone__icon--success" />
      <p class="drop-zone__filename">{{ store.file?.name }}</p>
      <Button
        label="החלף קובץ"
        icon="pi pi-refresh"
        severity="secondary"
        size="small"
        @click="triggerInput" />
      <input
        ref="fileInput"
        type="file"
        accept=".docx"
        class="drop-zone__input"
        @change="onInputChange" />
    </div>
    <div v-if="store.isLoading" class="drop-zone__loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
      <span>מנתח קובץ...</span>
    </div>
    <Message v-if="store.error" severity="error" :closable="false">{{
      store.error
    }}</Message>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useConverterStore } from "../stores/converter.js";
import Button from "primevue/button";
import Message from "primevue/message";
import ProgressSpinner from "primevue/progressspinner";

const store = useConverterStore();
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const hasFile = computed(() => store.file !== null && !store.isLoading);

function triggerInput(): void {
  fileInput.value?.click();
}

async function handleFile(file: File): Promise<void> {
  if (!file.name.endsWith(".docx")) {
    alert("יש לבחור קובץ DOCX בלבד");
    return;
  }
  await store.loadFile(file);
}

function onDrop(e: DragEvent): void {
  isDragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) handleFile(file);
}

function onInputChange(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleFile(file);
}
</script>

<style scoped>
.drop-zone {
  border: 2px dashed var(--p-surface-400);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition:
    border-color 0.2s,
    background 0.2s;
  position: relative;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone--active {
  border-color: var(--p-primary-color);
  background: var(--p-primary-50);
}

.drop-zone--loaded {
  border-style: solid;
  border-color: var(--p-green-400);
}

.drop-zone__content,
.drop-zone__loaded {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.drop-zone__icon {
  font-size: 3rem;
  color: var(--p-surface-400);
}

.drop-zone__icon--success {
  color: var(--p-green-500);
}

.drop-zone__text {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0;
}

.drop-zone__sub {
  color: var(--p-surface-500);
  margin: 0;
}

.drop-zone__filename {
  font-weight: 600;
  margin: 0;
  color: var(--p-green-700);
}

.drop-zone__input {
  display: none;
}

.drop-zone__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
}
</style>
