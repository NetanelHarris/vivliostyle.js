<template>
  <div class="detached-window">
    <LeftSidebar v-if="panel === 'sidebar'" />
    <EditorPanel v-else-if="panel === 'editor'" />
    <PreviewPanel v-else-if="panel === 'preview'" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import LeftSidebar from "./LeftSidebar.vue";
import EditorPanel from "./EditorPanel.vue";
import PreviewPanel from "./PreviewPanel.vue";
import { useProjectStore } from "../../stores/project";
import type { DetachablePanel } from "../../utils/window-mode";

defineProps<{ panel: DetachablePanel }>();

const project = useProjectStore();

onMounted(() => {
  project.startWatching();
});

onBeforeUnmount(() => {
  void project.closeProject();
});
</script>

<style scoped>
.detached-window {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
