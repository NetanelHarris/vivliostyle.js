<template>
  <div class="app">
    <header class="app__header">
      <h1 class="app__title">Vivliostyle DOCX Converter</h1>
      <p class="app__subtitle">
        המרת קבצי Word ל-HTML עם מיפוי סגנונות מותאם אישית
      </p>
    </header>

    <main class="app__main">
      <!-- Step 1: Upload -->
      <Card class="app__card">
        <template #title>
          <span class="step-title"
            ><span class="step-badge">1</span> העלאת קובץ</span
          >
        </template>
        <template #content>
          <FileDropZone />
        </template>
      </Card>

      <!-- Step 2: Style Mapping (only when doc is loaded) -->
      <Card v-if="store.hasDocument" class="app__card">
        <template #title>
          <div class="step-title-row">
            <span class="step-title"
              ><span class="step-badge">2</span> מיפוי סגנונות</span
            >
            <ConfigManager />
          </div>
        </template>
        <template #content>
          <StyleMappingTable />
        </template>
      </Card>

      <!-- Step 3: Preview & Download -->
      <Card v-if="store.hasDocument" class="app__card">
        <template #title>
          <span class="step-title"
            ><span class="step-badge">3</span> תצוגה מקדימה והורדה</span
          >
        </template>
        <template #content>
          <HtmlPreview />
        </template>
      </Card>
    </main>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { useConverterStore } from "./stores/converter.js";
import FileDropZone from "./components/FileDropZone.vue";
import StyleMappingTable from "./components/StyleMappingTable.vue";
import ConfigManager from "./components/ConfigManager.vue";
import HtmlPreview from "./components/HtmlPreview.vue";
import Card from "primevue/card";
import Toast from "primevue/toast";

const store = useConverterStore();
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--p-font-family), "Segoe UI", sans-serif;
  background: var(--p-surface-50);
  direction: rtl;
}
</style>

<style scoped>
.app {
  max-width: 1100px;
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

.app__logo {
  height: 2rem;
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

.app__card {
  box-shadow: var(--p-card-shadow);
}

.step-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

.step-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
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
