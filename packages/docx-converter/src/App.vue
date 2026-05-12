<template>
  <div class="app">
    <header class="app__header">
      <h1 class="app__title">Vivliostyle DOCX Converter</h1>
      <p class="app__subtitle">
        המרת קבצי Word ל-HTML עם מיפוי סגנונות מותאם אישית
      </p>
    </header>

    <main class="app__main">
      <div
        class="app__two-col"
        :class="{ 'app__two-col--expanded': store.hasDocument }">
        <!-- Left column: Step 1 + Step 2 -->
        <div class="app__col">
          <Panel
            v-model:collapsed="step1Collapsed"
            :toggleable="store.hasDocument"
            class="app__panel">
            <template #header>
              <span class="step-title"
                ><span class="step-badge">1</span> העלאת קובץ</span
              >
            </template>
            <FileDropZone />
          </Panel>

          <Panel
            v-if="store.hasDocument"
            v-model:collapsed="step2Collapsed"
            toggleable
            class="app__panel">
            <template #header>
              <div class="panel-header">
                <span class="step-title"
                  ><span class="step-badge">2</span> מיפוי סגנונות</span
                >
                <div class="panel-header__all-toggle">
                  <ToggleSwitch
                    :modelValue="store.allMappingsEnabled"
                    @update:modelValue="store.setAllMappingsEnabled" />
                  <label class="panel-header__all-label">הכל</label>
                </div>
                <ConfigManager />
              </div>
            </template>
            <StyleMappingTable />
          </Panel>

          <Panel
            v-if="store.hasDocument"
            v-model:collapsed="rulesCollapsed"
            toggleable
            class="app__panel">
            <template #header>
              <span class="step-title"
                ><span class="step-badge">2+</span> כללים מתקדמים</span
              >
            </template>
            <RulesEditor />
          </Panel>
        </div>

        <!-- Right column: Step 3 (hidden until document loaded) -->
        <div class="app__col app__col--preview">
          <Panel
            v-model:collapsed="step3Collapsed"
            toggleable
            class="app__panel">
            <template #header>
              <span class="step-title"
                ><span class="step-badge">3</span> תצוגה מקדימה והורדה</span
              >
            </template>
            <HtmlPreview />
          </Panel>
        </div>
      </div>
    </main>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useConverterStore } from "./stores/converter.js";
import FileDropZone from "./components/FileDropZone.vue";
import StyleMappingTable from "./components/StyleMappingTable.vue";
import RulesEditor from "./components/RulesEditor.vue";
import ConfigManager from "./components/ConfigManager.vue";
import HtmlPreview from "./components/HtmlPreview.vue";
import Panel from "primevue/panel";
import Toast from "primevue/toast";
import ToggleSwitch from "primevue/toggleswitch";

const store = useConverterStore();
const step1Collapsed = ref(false);
const step2Collapsed = ref(false);
const step3Collapsed = ref(false);
const rulesCollapsed = ref(true);
</script>

<style>
* {
  box-sizing: border-box;
}

html {
  font-family: "Heebo", sans-serif;
}

body {
  margin: 0;
  background: var(--p-surface-50);
  direction: rtl;
}
</style>

<style scoped>
.app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
}

.app__header {
  text-align: center;
  margin-bottom: 2rem;
}

.app__title {
  font-size: 1.8rem;
  margin: 0 0 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.app__subtitle {
  color: var(--p-surface-500);
  margin: 0;
}

.app__main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.app__two-col {
  display: grid;
  grid-template-columns: 1fr 0fr;
  column-gap: 0;
  align-items: start;
  transition:
    grid-template-columns 0.45s ease,
    column-gap 0.45s ease;
}

.app__two-col--expanded {
  grid-template-columns: 1fr 1fr;
  column-gap: 1.5rem;
}

.app__col {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.app__col--preview {
  min-width: 0;
  overflow: hidden;
}

.app__panel {
  box-shadow: var(--p-card-shadow);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  gap: 0.5rem;
}

.panel-header__all-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-inline-start: auto;
}

.panel-header__all-label {
  font-size: 0.85rem;
  color: var(--p-surface-600);
  font-weight: 500;
  cursor: pointer;
}

.step-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: var(--p-primary-color);
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
}
</style>
