<template>
  <div class="file-tree">
    <ProgressSpinner v-if="project.isLoading" style="width: 24px" />
    <Tree
      v-else-if="treeNodes.length"
      :value="treeNodes"
      class="file-tree__tree"
      selection-mode="single"
      v-model:selection-keys="selectedKeys"
      @node-select="onNodeSelect" />
    <p v-else class="file-tree__empty">תיקייה ריקה</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Tree from "primevue/tree";
import ProgressSpinner from "primevue/progressspinner";
import type { TreeNode } from "primevue/treenode";
import { useProjectStore } from "../../stores/project";
import { useEditorStore } from "../../stores/editor";
import { isTextFile } from "../../services/monaco-setup";
import { useToast } from "primevue/usetoast";

const project = useProjectStore();
const editor = useEditorStore();
const toast = useToast();
const selectedKeys = ref<Record<string, boolean>>({});

function iconFor(node: FileTreeNode): string {
  if (node.isDirectory) return "pi pi-folder";
  const ext = node.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "html":
    case "htm":
      return "pi pi-file-export";
    case "css":
      return "pi pi-palette";
    case "md":
    case "markdown":
      return "pi pi-file-edit";
    case "js":
    case "ts":
      return "pi pi-code";
    case "json":
      return "pi pi-database";
    case "docx":
      return "pi pi-file-word";
    default:
      return "pi pi-file";
  }
}

function toTreeNode(n: FileTreeNode): TreeNode {
  return {
    key: n.relativePath || n.path,
    label: n.name,
    icon: iconFor(n),
    data: n,
    leaf: !n.isDirectory,
    children: n.children?.map(toTreeNode),
  };
}

const treeNodes = computed<TreeNode[]>(() => {
  if (!project.tree) return [];
  return project.tree.children?.map(toTreeNode) ?? [];
});

async function onNodeSelect(node: TreeNode): Promise<void> {
  const data = node.data as FileTreeNode | undefined;
  if (!data || data.isDirectory) return;
  if (!isTextFile(data.path)) {
    toast.add({
      severity: "info",
      summary: "קובץ לא נתמך לעריכה",
      detail: data.name,
      life: 2500,
    });
    return;
  }
  try {
    await editor.openFile(data.path, data.relativePath);
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "שגיאה בפתיחת קובץ",
      detail: e instanceof Error ? e.message : String(e),
      life: 4000,
    });
  }
}
</script>

<style scoped>
.file-tree {
  padding: 0.25rem;
  font-size: 0.85rem;
}

.file-tree__tree {
  border: none;
  background: transparent;
}

.file-tree__empty {
  text-align: center;
  color: var(--p-surface-500);
  font-size: 0.85rem;
  margin: 1rem 0;
}

:deep(.p-tree-node-label) {
  font-size: 0.85rem;
}

:deep(.p-tree-node-content) {
  padding: 0.2rem 0.4rem;
}
</style>
