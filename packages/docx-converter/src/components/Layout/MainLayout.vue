<template>
  <div class="layout">
    <Splitter class="layout__splitter" style="height: 100vh">
      <SplitterPanel
        v-if="!detached.sidebar"
        :size="sidebarSize"
        :min-size="15"
        class="layout__panel">
        <LeftSidebar @detach="detachPanel('sidebar')" />
      </SplitterPanel>
      <SplitterPanel
        v-if="!detached.editor"
        :size="editorSize"
        :min-size="20"
        class="layout__panel">
        <EditorPanel @detach="detachPanel('editor')" />
      </SplitterPanel>
      <SplitterPanel
        v-if="!detached.preview"
        :size="previewSize"
        :min-size="15"
        class="layout__panel">
        <PreviewPanel @detach="detachPanel('preview')" />
      </SplitterPanel>
    </Splitter>
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, computed } from "vue";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Toast from "primevue/toast";
import LeftSidebar from "./LeftSidebar.vue";
import EditorPanel from "./EditorPanel.vue";
import PreviewPanel from "./PreviewPanel.vue";
import { useProjectStore } from "../../stores/project";

const project = useProjectStore();

const detached = reactive({ sidebar: false, editor: false, preview: false });

const visibleCount = computed(
  () =>
    (detached.sidebar ? 0 : 1) +
    (detached.editor ? 0 : 1) +
    (detached.preview ? 0 : 1),
);

const sidebarSize = computed(() => {
  if (visibleCount.value === 3) return 22;
  if (visibleCount.value === 2) return detached.editor ? 40 : 30;
  return 100;
});

const editorSize = computed(() => {
  if (visibleCount.value === 3) return 44;
  if (visibleCount.value === 2) return detached.preview ? 60 : 70;
  return 100;
});

const previewSize = computed(() => {
  if (visibleCount.value === 3) return 34;
  if (visibleCount.value === 2) return detached.sidebar ? 60 : 40;
  return 100;
});

async function detachPanel(panel: "sidebar" | "editor" | "preview") {
  if (!window.electron) return;
  await window.electron.openPanel(panel, { project: project.rootPath ?? undefined });
  detached[panel] = true;
}

onMounted(() => {
  project.startWatching();
  window.electron?.onPanelClosed(({ panel }) => {
    if (panel === "sidebar" || panel === "editor" || panel === "preview") {
      detached[panel] = false;
    }
  });
});

onBeforeUnmount(() => {
  void project.closeProject();
  window.electron?.removePanelListeners();
});
</script>

<style scoped>
.layout {
  height: 100vh;
  overflow: hidden;
}

.layout__splitter {
  border: none;
  border-radius: 0;
}

.layout__panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
