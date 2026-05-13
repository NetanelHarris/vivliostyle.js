<template>
  <div class="sidebar">
    <div class="sidebar__header">
      <span class="sidebar__title">{{
        project.projectName ?? "Vivliostyle Workspace"
      }}</span>
      <div class="sidebar__actions">
        <Button
          icon="pi pi-folder-open"
          severity="secondary"
          text
          size="small"
          v-tooltip.bottom="'פתח פרויקט'"
          @click="onOpenProject" />
        <Button
          v-if="project.isOpen"
          icon="pi pi-refresh"
          severity="secondary"
          text
          size="small"
          v-tooltip.bottom="'רענן עץ קבצים'"
          @click="project.refreshTree()" />
      </div>
    </div>

    <Accordion
      v-model:value="activeSections"
      multiple
      class="sidebar__accordion">
      <AccordionPanel value="project">
        <AccordionHeader>פרויקט</AccordionHeader>
        <AccordionContent>
          <ProjectSection />
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="settings">
        <AccordionHeader>הגדרות</AccordionHeader>
        <AccordionContent>
          <SettingsSection />
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="docx">
        <AccordionHeader>ייבוא DOCX</AccordionHeader>
        <AccordionContent>
          <DocxImportSection />
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="actions">
        <AccordionHeader>פעולות</AccordionHeader>
        <AccordionContent>
          <ActionsSection />
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Accordion from "primevue/accordion";
import AccordionPanel from "primevue/accordionpanel";
import AccordionHeader from "primevue/accordionheader";
import AccordionContent from "primevue/accordioncontent";
import Button from "primevue/button";
import { useProjectStore } from "../../stores/project";
import ProjectSection from "../Project/ProjectSection.vue";
import SettingsSection from "../Settings/SettingsSection.vue";
import ActionsSection from "../Actions/ActionsSection.vue";
import DocxImportSection from "../DocxImport/DocxImportSection.vue";

const project = useProjectStore();
const activeSections = ref<string[]>(["project"]);

async function onOpenProject(): Promise<void> {
  await project.openProjectDialog();
}
</script>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--p-surface-50);
  border-inline-end: 1px solid var(--p-surface-200);
  overflow: hidden;
}

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--p-surface-100);
  border-block-end: 1px solid var(--p-surface-200);
  gap: 0.5rem;
}

.sidebar__title {
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__actions {
  display: flex;
  gap: 0.25rem;
}

.sidebar__accordion {
  flex: 1;
  overflow-y: auto;
}

.sidebar__placeholder {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  color: var(--p-surface-500);
  font-size: 0.85rem;
}
</style>
