<template>
  <div class="editor-panel">
    <EditorTabs />
    <div class="editor-panel__body">
      <MonacoEditor
        v-if="editor.activeFile"
        :key="editor.activeFile.path"
        :value="editor.activeFile.content"
        :language="editor.activeFile.language"
        :path="editor.activeFile.path"
        @update:value="onContent"
        @save="onSave" />
      <div v-else class="editor-panel__placeholder">
        <i class="pi pi-file-edit" />
        <h2>אין קובץ פתוח</h2>
        <p v-if="project.isOpen">בחר קובץ מעץ הקבצים כדי לערוך אותו</p>
        <p v-else>פתח פרויקט מסרגל הצד כדי להתחיל</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from "../../stores/editor";
import { useProjectStore } from "../../stores/project";
import EditorTabs from "../Editor/EditorTabs.vue";
import MonacoEditor from "../Editor/MonacoEditor.vue";
import { useToast } from "primevue/usetoast";

const editor = useEditorStore();
const project = useProjectStore();
const toast = useToast();

function onContent(value: string): void {
  if (!editor.activeFile) return;
  editor.updateContent(editor.activeFile.path, value);
}

async function onSave(): Promise<void> {
  if (!editor.activeFile) return;
  try {
    await editor.saveActive();
    toast.add({
      severity: "success",
      summary: "נשמר",
      detail: editor.activeFile.name,
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
</script>

<style scoped>
.editor-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--p-surface-0);
  overflow: hidden;
}

.editor-panel__body {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.editor-panel__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--p-surface-500);
  text-align: center;
}

.editor-panel__placeholder i {
  font-size: 3rem;
  opacity: 0.3;
}

.editor-panel__placeholder h2 {
  margin: 0.5rem 0;
  font-weight: 600;
  font-size: 1rem;
}

.editor-panel__placeholder p {
  margin: 0;
  font-size: 0.9rem;
}
</style>
