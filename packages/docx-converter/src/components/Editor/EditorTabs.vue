<template>
  <div class="editor-tabs" v-if="editor.openFiles.length">
    <div
      v-for="file in editor.openFiles"
      :key="file.path"
      class="editor-tabs__tab"
      :class="{ 'editor-tabs__tab--active': file.path === editor.activePath }"
      :title="file.path"
      @click="editor.setActive(file.path)">
      <span class="editor-tabs__name">{{ file.name }}</span>
      <span v-if="editor.isDirty(file)" class="editor-tabs__dirty">●</span>
      <button
        class="editor-tabs__close"
        @click.stop="onClose(file.path)"
        :title="'סגור'">
        <i class="pi pi-times" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from "../../stores/editor";

const editor = useEditorStore();

function onClose(path: string): void {
  const file = editor.openFiles.find((f) => f.path === path);
  if (file && editor.isDirty(file)) {
    const ok = window.confirm(
      `שינויים לא נשמרו ב-${file.name}. לסגור בכל זאת?`,
    );
    if (!ok) return;
  }
  editor.closeFile(path);
}
</script>

<style scoped>
.editor-tabs {
  display: flex;
  overflow-x: auto;
  background: var(--p-surface-100);
  border-block-end: 1px solid var(--p-surface-200);
  flex-shrink: 0;
}

.editor-tabs__tab {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  border-inline-end: 1px solid var(--p-surface-200);
  font-size: 0.85rem;
  white-space: nowrap;
  user-select: none;
  background: var(--p-surface-100);
  color: var(--p-surface-700);
}

.editor-tabs__tab:hover {
  background: var(--p-surface-200);
}

.editor-tabs__tab--active {
  background: var(--p-surface-0);
  color: var(--p-text-color);
  border-block-end: 2px solid var(--p-primary-color);
  padding-block-end: calc(0.4rem - 2px);
}

.editor-tabs__name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-tabs__dirty {
  color: var(--p-primary-color);
  font-size: 0.7rem;
}

.editor-tabs__close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--p-surface-500);
  padding: 0;
  display: flex;
  align-items: center;
}

.editor-tabs__close:hover {
  color: var(--p-text-color);
}

.editor-tabs__close i {
  font-size: 0.7rem;
}
</style>
