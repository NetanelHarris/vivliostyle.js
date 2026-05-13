<template>
  <div class="project-section">
    <div v-if="!project.isOpen" class="project-section__empty">
      <p class="project-section__empty-text">לא נטען פרויקט</p>
      <Button
        label="פתח תיקיית פרויקט"
        icon="pi pi-folder-open"
        size="small"
        class="project-section__open-btn"
        @click="onOpen" />

      <div v-if="project.recent.length" class="project-section__recent">
        <div class="project-section__recent-title">פרויקטים אחרונים</div>
        <ul class="project-section__recent-list">
          <li
            v-for="path in project.recent"
            :key="path"
            class="project-section__recent-item"
            :title="path"
            @click="project.openProject(path)">
            <i class="pi pi-folder" />
            <span>{{ shortName(path) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <FileTree v-else />

    <Message
      v-if="project.error"
      severity="error"
      :closable="true"
      class="project-section__error">
      {{ project.error }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Message from "primevue/message";
import { useProjectStore } from "../../stores/project";
import FileTree from "./FileTree.vue";

const project = useProjectStore();

async function onOpen(): Promise<void> {
  await project.openProjectDialog();
}

function shortName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}
</script>

<style scoped>
.project-section {
  padding: 0.5rem;
}

.project-section__empty {
  text-align: center;
  padding: 1rem;
}

.project-section__empty-text {
  margin: 0 0 0.75rem;
  color: var(--p-surface-500);
  font-size: 0.9rem;
}

.project-section__open-btn {
  width: 100%;
}

.project-section__recent {
  margin-top: 1.25rem;
  text-align: start;
}

.project-section__recent-title {
  font-size: 0.8rem;
  color: var(--p-surface-500);
  margin-bottom: 0.4rem;
}

.project-section__recent-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.project-section__recent-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--p-text-color);
}

.project-section__recent-item:hover {
  background: var(--p-surface-200);
}

.project-section__error {
  margin-top: 0.5rem;
}
</style>
