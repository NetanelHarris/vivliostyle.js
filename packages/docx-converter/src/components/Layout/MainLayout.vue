<template>
  <div class="layout">
    <Splitter class="layout__splitter" style="height: 100vh">
      <SplitterPanel :size="22" :min-size="15" class="layout__panel">
        <LeftSidebar />
      </SplitterPanel>
      <SplitterPanel :size="44" :min-size="20" class="layout__panel">
        <EditorPanel />
      </SplitterPanel>
      <SplitterPanel :size="34" :min-size="15" class="layout__panel">
        <PreviewPanel />
      </SplitterPanel>
    </Splitter>
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Toast from "primevue/toast";
import LeftSidebar from "./LeftSidebar.vue";
import EditorPanel from "./EditorPanel.vue";
import PreviewPanel from "./PreviewPanel.vue";
import { useProjectStore } from "../../stores/project";

const project = useProjectStore();

onMounted(() => {
  project.startWatching();
});

onBeforeUnmount(() => {
  void project.closeProject();
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
