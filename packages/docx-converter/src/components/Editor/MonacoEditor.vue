<template>
  <div ref="containerRef" class="monaco-editor-host"></div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { installMonacoEnvironment, monaco } from "../../services/monaco-setup";

const props = defineProps<{
  value: string;
  language: string;
  path: string;
}>();

const emit = defineEmits<{
  (e: "update:value", value: string): void;
  (e: "save"): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let suppressChange = false;
let resizeObserver: ResizeObserver | null = null;

installMonacoEnvironment();

onMounted(async () => {
  await nextTick();
  if (!containerRef.value) return;
  editor = monaco.editor.create(containerRef.value, {
    value: props.value,
    language: props.language,
    automaticLayout: true,
    fontSize: 13,
    fontFamily: "Consolas, 'Courier New', monospace",
    minimap: { enabled: false },
    wordWrap: "on",
    tabSize: 2,
    scrollBeyondLastLine: false,
    renderWhitespace: "selection",
    theme: "vs",
  });
  editor.onDidChangeModelContent(() => {
    if (suppressChange) return;
    emit("update:value", editor!.getValue());
  });
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    emit("save");
  });

  // Force layout once dimensions are known
  requestAnimationFrame(() => editor?.layout());
  if (typeof ResizeObserver !== "undefined" && containerRef.value) {
    resizeObserver = new ResizeObserver(() => editor?.layout());
    resizeObserver.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  const model = editor?.getModel();
  editor?.dispose();
  model?.dispose();
  editor = null;
});

watch(
  () => props.value,
  (next) => {
    if (!editor) return;
    const model = editor.getModel();
    if (!model || model.getValue() === next) return;
    suppressChange = true;
    model.setValue(next);
    suppressChange = false;
  },
);

watch(
  () => props.language,
  (next) => {
    const model = editor?.getModel();
    if (model) monaco.editor.setModelLanguage(model, next);
  },
);
</script>

<style scoped>
.monaco-editor-host {
  position: absolute;
  inset: 0;
  overflow: hidden;
  direction: ltr;
  text-align: left;
}
</style>

<style>
/* Monaco renders into the host and uses absolute positioning internally.
   Force LTR everywhere to escape the app-wide RTL. */
.monaco-editor-host,
.monaco-editor-host * {
  direction: ltr;
}
.monaco-editor-host .monaco-editor,
.monaco-editor-host .monaco-editor .overflow-guard {
  text-align: left;
}
</style>
