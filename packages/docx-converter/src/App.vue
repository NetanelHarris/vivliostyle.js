<template>
  <MainLayout />
</template>

<script setup lang="ts">
import MainLayout from "./components/Layout/MainLayout.vue";
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
