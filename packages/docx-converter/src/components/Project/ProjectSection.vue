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
      <Button
        label="פרויקט חדש"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        outlined
        class="project-section__open-btn"
        style="margin-top: 0.5rem"
        @click="showNewDialog = true" />

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

    <Dialog
      v-model:visible="showNewDialog"
      modal
      dir="rtl"
      header="פרויקט חדש"
      :style="{ width: '420px' }">
      <div class="new-project-form">
        <div class="new-project-form__row">
          <label for="new-project-name">שם הפרויקט</label>
          <InputText
            id="new-project-name"
            v-model="newProjectName"
            placeholder="my-project"
            size="small"
            class="new-project-form__input" />
        </div>
        <div class="new-project-form__row">
          <label>תיקיית יעד</label>
          <div class="new-project-form__path-row">
            <span class="new-project-form__path-display">
              {{ newProjectParent ?? "לא נבחרה תיקייה" }}
            </span>
            <Button
              label="עיין…"
              size="small"
              severity="secondary"
              @click="pickParent" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button
          label="ביטול"
          severity="secondary"
          text
          @click="showNewDialog = false" />
        <Button
          label="צור"
          :disabled="!newProjectName.trim() || !newProjectParent"
          @click="onCreate" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { useProjectStore } from "../../stores/project";
import FileTree from "./FileTree.vue";

const project = useProjectStore();

const showNewDialog = ref(false);
const newProjectName = ref("");
const newProjectParent = ref<string | null>(null);

async function onOpen(): Promise<void> {
  await project.openProjectDialog();
}

function shortName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

async function pickParent(): Promise<void> {
  const dir = (await window.electron?.openDirectory()) ?? null;
  if (dir) newProjectParent.value = dir;
}

async function onCreate(): Promise<void> {
  if (!newProjectName.value.trim() || !newProjectParent.value) return;
  await project.createProject(
    newProjectParent.value,
    newProjectName.value.trim(),
  );
  showNewDialog.value = false;
  newProjectName.value = "";
  newProjectParent.value = null;
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

.new-project-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.25rem 0;
}

.new-project-form__row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.new-project-form__row label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.new-project-form__input {
  width: 100%;
}

.new-project-form__path-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.new-project-form__path-display {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  color: var(--p-surface-500);
  border: 1px solid var(--p-surface-300);
  border-radius: 4px;
  padding: 0.3rem 0.5rem;
  background: var(--p-surface-50);
}
</style>
