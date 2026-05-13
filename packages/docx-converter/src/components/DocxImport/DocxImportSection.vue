<template>
  <div class="docx-section">
    <FileDropZone />

    <div v-if="store.hasDocument" class="docx-section__group">
      <div class="docx-section__group-header">
        <span>כללים</span>
        <ConfigManager />
      </div>
      <RulesEditor />
    </div>

    <div v-if="store.hasDocument" class="docx-section__group">
      <span class="docx-section__group-header">תצוגה והורדה</span>
      <HtmlPreview />
    </div>

    <div
      v-if="store.hasDocument && project.isOpen"
      class="docx-section__group docx-section__add">
      <Button
        :label="isAdding ? 'מוסיף לפרויקט…' : 'הוסף לפרויקט'"
        :icon="isAdding ? 'pi pi-spin pi-spinner' : 'pi pi-plus'"
        :disabled="isAdding || !store.hasOutput"
        size="small"
        class="docx-section__add-btn"
        @click="onAddToProject" />
      <p class="docx-section__hint">
        <i class="pi pi-info-circle" />
        ה-HTML המומר ייכתב ל-<code>imported/</code> תחת הפרויקט הנוכחי, וייווסף
        כ-entry ל-<code>vivliostyle.config.js</code> (זכור לשמור את ההגדרות
        אחרי).
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { useConverterStore } from "../../stores/converter";
import { useProjectStore } from "../../stores/project";
import { useConfigStore } from "../../stores/config";
import FileDropZone from "../FileDropZone.vue";
import RulesEditor from "../RulesEditor.vue";
import ConfigManager from "../ConfigManager.vue";
import HtmlPreview from "../HtmlPreview.vue";

const store = useConverterStore();
const project = useProjectStore();
const config = useConfigStore();
const toast = useToast();

const isAdding = ref(false);

async function onAddToProject(): Promise<void> {
  if (!project.rootPath) return;
  isAdding.value = true;
  try {
    const absPath = await store.addToProject(project.rootPath);
    // Compute relative path (forward slashes) for the config entry
    const root = project.rootPath.replace(/[\\/]+$/, "");
    const rel = absPath.startsWith(root)
      ? absPath
          .slice(root.length)
          .replace(/^[\\/]+/, "")
          .replace(/\\/g, "/")
      : absPath.replace(/\\/g, "/");

    const name =
      rel
        .split("/")
        .pop()
        ?.replace(/\.html?$/i, "") ?? "imported";
    if (config.hasConfig) {
      config.addEntry({ path: rel, title: name });
    }
    await project.refreshTree();

    toast.add({
      severity: "success",
      summary: "נוסף לפרויקט",
      detail: rel,
      life: 3000,
    });
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "שגיאה בהוספה לפרויקט",
      detail: e instanceof Error ? e.message : String(e),
      life: 5000,
    });
  } finally {
    isAdding.value = false;
  }
}
</script>

<style scoped>
.docx-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem;
}

.docx-section__group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-block-start: 0.5rem;
  border-block-start: 1px solid var(--p-surface-200);
}

.docx-section__group-header {
  font-weight: 600;
  font-size: 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.docx-section__add {
  background: var(--p-surface-50);
  border-radius: 6px;
  padding: 0.6rem;
  border: 1px solid var(--p-primary-200, var(--p-surface-200));
}

.docx-section__add-btn {
  width: 100%;
}

.docx-section__hint {
  font-size: 0.75rem;
  color: var(--p-surface-500);
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0.5rem 0 0;
  line-height: 1.4;
}

.docx-section__hint code {
  font-family: Consolas, monospace;
  background: var(--p-surface-200);
  padding: 1px 4px;
  border-radius: 2px;
}
</style>
