<template>
  <div class="config-form">
    <Fieldset legend="כללי" :toggleable="true">
      <div class="config-form__row">
        <label>כותרת</label>
        <InputText v-model="title" size="small" />
      </div>
      <div class="config-form__row">
        <label>מחבר</label>
        <InputText v-model="author" size="small" />
      </div>
      <div class="config-form__row">
        <label>שפה</label>
        <InputText v-model="language" size="small" placeholder="he, en, ja…" />
      </div>
      <div class="config-form__row">
        <label>כיוון קריאה</label>
        <Select
          v-model="readingProgression"
          :options="readingOptions"
          option-label="label"
          option-value="value"
          size="small"
          show-clear />
      </div>
    </Fieldset>

    <Fieldset legend="פורמט עמוד" :toggleable="true">
      <div class="config-form__row">
        <label>גודל</label>
        <Select
          v-model="sizePreset"
          :options="sizeOptions"
          option-label="label"
          option-value="value"
          size="small"
          @change="onSizePresetChange" />
      </div>
      <div v-if="sizePreset === 'custom'" class="config-form__row">
        <label>גודל מותאם</label>
        <InputText v-model="size" size="small" placeholder="182mm,257mm" />
      </div>
    </Fieldset>

    <Fieldset legend="עיצוב" :toggleable="true">
      <div class="config-form__row">
        <label>Theme</label>
        <InputText
          v-model="theme"
          size="small"
          placeholder="שם חבילה npm או נתיב מקומי" />
      </div>
    </Fieldset>

    <Fieldset legend="כניסות (Entries)" :toggleable="true">
      <div
        v-for="(entry, idx) in entries"
        :key="idx"
        class="config-form__entry">
        <div class="config-form__entry-header">
          <span class="config-form__entry-title">#{{ idx + 1 }}</span>
          <div class="config-form__entry-actions">
            <Button
              icon="pi pi-arrow-up"
              size="small"
              text
              :disabled="idx === 0"
              @click="moveEntry(idx, -1)" />
            <Button
              icon="pi pi-arrow-down"
              size="small"
              text
              :disabled="idx === entries.length - 1"
              @click="moveEntry(idx, 1)" />
            <Button
              icon="pi pi-trash"
              size="small"
              text
              severity="danger"
              @click="removeEntry(idx)" />
          </div>
        </div>
        <div class="config-form__row">
          <label>נתיב</label>
          <InputText
            :model-value="entry.path"
            @update:model-value="updateEntry(idx, 'path', $event)"
            size="small"
            placeholder="chapter1.html" />
        </div>
        <div class="config-form__row">
          <label>כותרת</label>
          <InputText
            :model-value="entry.title ?? ''"
            @update:model-value="updateEntry(idx, 'title', $event)"
            size="small" />
        </div>
        <div class="config-form__row">
          <label>Theme</label>
          <InputText
            :model-value="entry.theme ?? ''"
            @update:model-value="updateEntry(idx, 'theme', $event)"
            size="small" />
        </div>
      </div>
      <Button
        icon="pi pi-plus"
        label="הוסף כניסה"
        size="small"
        outlined
        class="config-form__add"
        @click="addEntry" />
    </Fieldset>

    <Fieldset
      v-if="advancedFields.length"
      legend="מתקדם"
      :toggleable="true"
      :collapsed="true">
      <div class="config-form__row">
        <label>Image (Docker)</label>
        <InputText
          v-model="image"
          size="small"
          placeholder="ריק = בלי Docker" />
      </div>
      <div class="config-form__row">
        <label>Browser</label>
        <InputText
          v-model="browser"
          size="small"
          placeholder="chrome, firefox, chrome@129…" />
      </div>
    </Fieldset>

    <div v-if="data.unknownKeys.length" class="config-form__unknown">
      <i class="pi pi-info-circle" />
      שדות נוספים בקובץ נשמרים אוטומטית ולא נערכים מהטופס:
      <code>{{ data.unknownKeys.join(", ") }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Fieldset from "primevue/fieldset";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Button from "primevue/button";
import type { ConfigData, ConfigEntry } from "../../services/config-codec";

const props = defineProps<{
  data: ConfigData;
}>();

const emit = defineEmits<{
  (e: "update:data", value: ConfigData): void;
}>();

const readingOptions = [
  { label: "אוטומטי", value: undefined },
  { label: "ימין לשמאל (RTL)", value: "rtl" },
  { label: "שמאל לימין (LTR)", value: "ltr" },
];

const SIZE_PRESETS = [
  "A5",
  "A4",
  "A3",
  "B5",
  "B4",
  "JIS-B5",
  "JIS-B4",
  "letter",
  "legal",
  "ledger",
];
const sizeOptions = [
  { label: "ברירת מחדל", value: "" },
  ...SIZE_PRESETS.map((s) => ({ label: s, value: s })),
  { label: "מותאם אישית", value: "custom" },
];

function patch(partial: Partial<ConfigData>): void {
  emit("update:data", { ...props.data, ...partial });
}

const title = computed({
  get: () => props.data.title ?? "",
  set: (v) => patch({ title: v || undefined }),
});
const author = computed({
  get: () => props.data.author ?? "",
  set: (v) => patch({ author: v || undefined }),
});
const language = computed({
  get: () => props.data.language ?? "",
  set: (v) => patch({ language: v || undefined }),
});
const readingProgression = computed({
  get: () => props.data.readingProgression,
  set: (v) => patch({ readingProgression: v ?? undefined }),
});
const theme = computed({
  get: () => props.data.theme ?? "",
  set: (v) => patch({ theme: v || undefined }),
});
const image = computed({
  get: () => props.data.image ?? "",
  set: (v) => patch({ image: v || undefined }),
});
const browser = computed({
  get: () => props.data.browser ?? "",
  set: (v) => patch({ browser: v || undefined }),
});

const sizePreset = computed({
  get: () => {
    const s = props.data.size;
    if (!s) return "";
    if (SIZE_PRESETS.includes(s)) return s;
    return "custom";
  },
  set: (v: string) => {
    if (v === "") patch({ size: undefined });
    else if (v === "custom") {
      // keep existing custom value if already set, otherwise empty
      if (!props.data.size || SIZE_PRESETS.includes(props.data.size)) {
        patch({ size: "" });
      }
    } else patch({ size: v });
  },
});
const size = computed({
  get: () => props.data.size ?? "",
  set: (v) => patch({ size: v || undefined }),
});

function onSizePresetChange(_: unknown): void {
  // handled by setter
}

const entries = computed(() => props.data.entry ?? []);

const advancedFields = computed(() => {
  const a: string[] = [];
  if (props.data.image !== undefined) a.push("image");
  if (props.data.browser !== undefined) a.push("browser");
  return a.length ? a : ["image", "browser"];
});

function addEntry(): void {
  const next = [...(props.data.entry ?? []), { path: "" } as ConfigEntry];
  patch({ entry: next });
}

function removeEntry(idx: number): void {
  const next = [...(props.data.entry ?? [])];
  next.splice(idx, 1);
  patch({ entry: next });
}

function moveEntry(idx: number, delta: number): void {
  const next = [...(props.data.entry ?? [])];
  const target = idx + delta;
  if (target < 0 || target >= next.length) return;
  [next[idx], next[target]] = [next[target], next[idx]];
  patch({ entry: next });
}

function updateEntry(
  idx: number,
  key: keyof ConfigEntry,
  value: string | undefined,
): void {
  const next = [...(props.data.entry ?? [])];
  const v = value ?? "";
  const updated = { ...next[idx], [key]: v || undefined };
  if (key === "path") updated.path = v;
  next[idx] = updated as ConfigEntry;
  patch({ entry: next });
}
</script>

<style scoped>
.config-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.85rem;
}

.config-form :deep(.p-fieldset-legend) {
  font-size: 0.85rem;
  font-weight: 600;
}

.config-form :deep(.p-fieldset-content) {
  padding: 0.5rem;
}

.config-form__row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.5rem;
}

.config-form__row label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--p-surface-700);
}

.config-form__row :deep(.p-inputtext),
.config-form__row :deep(.p-select) {
  width: 100%;
  font-size: 0.85rem;
}

.config-form__entry {
  border: 1px solid var(--p-surface-200);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--p-surface-50);
}

.config-form__entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.config-form__entry-title {
  font-weight: 600;
  color: var(--p-surface-600);
  font-size: 0.8rem;
}

.config-form__entry-actions {
  display: flex;
  gap: 0.1rem;
}

.config-form__add {
  width: 100%;
}

.config-form__unknown {
  font-size: 0.75rem;
  color: var(--p-surface-500);
  padding: 0.5rem;
  background: var(--p-surface-100);
  border-radius: 4px;
}

.config-form__unknown code {
  font-family: Consolas, monospace;
  font-size: 0.72rem;
  background: var(--p-surface-200);
  padding: 1px 4px;
  border-radius: 2px;
}
</style>
