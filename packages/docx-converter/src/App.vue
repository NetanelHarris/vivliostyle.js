<template>
  <DetachedPanel v-if="panelMode" :panel="panelMode" />
  <MainLayout v-else />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import MainLayout from "./components/Layout/MainLayout.vue";
import DetachedPanel from "./components/Layout/DetachedPanel.vue";
import { getDetachedPanel, getDetachedProject } from "./utils/window-mode";
import { useProjectStore } from "./stores/project";
import type { DetachablePanel } from "./utils/window-mode";

const panelMode = getDetachedPanel() as DetachablePanel | null;
const projectPath = getDetachedProject();

if (panelMode && projectPath) {
  const project = useProjectStore();
  onMounted(() => {
    void project.openProject(projectPath);
  });
}
</script>

<style>
* {
  box-sizing: border-box;
}

html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: "Heebo", sans-serif;
}

body {
  background: var(--p-surface-50);
  direction: rtl;
}

/* Monaco needs default box-sizing for its internal pixel-perfect layout */
.monaco-editor-host,
.monaco-editor-host * {
  box-sizing: content-box;
}
</style>
