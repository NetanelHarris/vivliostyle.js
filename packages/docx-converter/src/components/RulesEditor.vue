<template>
  <div class="rules-editor">
    <p class="rules-editor__hint">
      הכלל הראשון שתואם לפיסקה או ל-run "ניצח" וקובע את התג ו-class. אם שום כלל
      לא תואם — חוזרים לטבלת מיפוי הסגנונות.
    </p>

    <div v-if="store.rules.length === 0" class="rules-editor__empty">
      אין כללים מתקדמים. הוסף כלל כדי למפות לפי שילוב של תכונות (יישור, גודל,
      בולד וכו').
    </div>

    <div v-for="(rule, idx) in store.rules" :key="rule.id" class="rule-card">
      <div class="rule-card__top">
        <span class="rule-card__index">{{ idx + 1 }}</span>
        <InputText
          :modelValue="rule.name"
          placeholder="שם הכלל"
          class="rule-card__name"
          @update:modelValue="(v) => store.updateRule(rule.id, { name: v })" />
        <ToggleSwitch
          :modelValue="rule.enabled"
          @update:modelValue="
            (v) => store.updateRule(rule.id, { enabled: v })
          " />
        <span class="rule-card__enabled-label">פעיל</span>
        <div class="rule-card__order">
          <Button
            icon="pi pi-arrow-up"
            severity="secondary"
            size="small"
            text
            :disabled="idx === 0"
            @click="store.moveRule(rule.id, -1)" />
          <Button
            icon="pi pi-arrow-down"
            severity="secondary"
            size="small"
            text
            :disabled="idx === store.rules.length - 1"
            @click="store.moveRule(rule.id, 1)" />
        </div>
        <Button
          icon="pi pi-trash"
          severity="danger"
          size="small"
          text
          @click="store.removeRule(rule.id)" />
      </div>

      <div class="rule-card__row">
        <label class="rule-card__field">
          <span>טווח:</span>
          <Select
            :modelValue="rule.condition.scope"
            :options="scopeOptions"
            optionLabel="label"
            optionValue="value"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  scope: v as 'paragraph' | 'run',
                })
            " />
        </label>
      </div>

      <div class="rule-card__row rule-card__row--conditions">
        <label class="rule-card__field">
          <span>שם סגנון:</span>
          <Select
            :modelValue="rule.condition.styleName ?? ''"
            :options="styleOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  styleName: v ? (v as string) : undefined,
                })
            " />
        </label>

        <label class="rule-card__field">
          <span>יישור:</span>
          <Select
            :modelValue="rule.condition.alignment ?? ''"
            :options="alignmentOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  alignment: v ? (v as Alignment) : undefined,
                })
            " />
        </label>

        <label class="rule-card__field">
          <span>גודל גופן מינ' (pt):</span>
          <Select
            :modelValue="rule.condition.fontSizeMin ?? ''"
            :options="fontSizeOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  fontSizeMin: v === '' ? undefined : (v as number),
                })
            " />
        </label>

        <label class="rule-card__field">
          <span>גודל גופן מקס' (pt):</span>
          <Select
            :modelValue="rule.condition.fontSizeMax ?? ''"
            :options="fontSizeOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  fontSizeMax: v === '' ? undefined : (v as number),
                })
            " />
        </label>

        <label class="rule-card__field">
          <span>בולד:</span>
          <Select
            :modelValue="rule.condition.bold ?? 'any'"
            :options="triOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select rule-card__select--tri"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  bold: v === 'any' ? undefined : (v as TriState),
                })
            " />
        </label>

        <label class="rule-card__field">
          <span>נטוי:</span>
          <Select
            :modelValue="rule.condition.italic ?? 'any'"
            :options="triOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select rule-card__select--tri"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  italic: v === 'any' ? undefined : (v as TriState),
                })
            " />
        </label>

        <label class="rule-card__field">
          <span>קו תחתון:</span>
          <Select
            :modelValue="rule.condition.underline ?? 'any'"
            :options="triOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select rule-card__select--tri"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  underline: v === 'any' ? undefined : (v as TriState),
                })
            " />
        </label>

        <label class="rule-card__field">
          <span>קו חוצה:</span>
          <Select
            :modelValue="rule.condition.strikethrough ?? 'any'"
            :options="triOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select rule-card__select--tri"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  strikethrough: v === 'any' ? undefined : (v as TriState),
                })
            " />
        </label>

        <label class="rule-card__field">
          <span>צבע:</span>
          <Select
            :modelValue="rule.condition.color ?? ''"
            :options="colorOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  color: v ? (v as string) : undefined,
                })
            ">
            <template #option="slotProps">
              <span class="color-option">
                <span
                  v-if="slotProps.option.value"
                  class="color-swatch"
                  :style="{ background: `#${slotProps.option.value}` }" />
                <span>{{ slotProps.option.label }}</span>
              </span>
            </template>
            <template #value="slotProps">
              <span class="color-option">
                <span
                  v-if="slotProps.value"
                  class="color-swatch"
                  :style="{ background: `#${slotProps.value}` }" />
                <span>{{ slotProps.value || "(כל צבע)" }}</span>
              </span>
            </template>
          </Select>
        </label>

        <label class="rule-card__field">
          <span>שם גופן:</span>
          <Select
            :modelValue="rule.condition.fontName ?? ''"
            :options="fontNameOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  fontName: v ? (v as string) : undefined,
                })
            " />
        </label>

        <label
          v-if="rule.condition.scope === 'paragraph'"
          class="rule-card__field">
          <span>indent מינ' (pt):</span>
          <Select
            :modelValue="rule.condition.indentMin ?? ''"
            :options="indentOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  indentMin: v === '' ? undefined : (v as number),
                })
            " />
        </label>

        <label
          v-if="rule.condition.scope === 'paragraph'"
          class="rule-card__field">
          <span>התאמת runs:</span>
          <Select
            :modelValue="rule.condition.runMatchMode ?? 'all'"
            :options="runMatchModeOptions"
            optionLabel="label"
            optionValue="value"
            class="rule-card__select"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule.id, {
                  runMatchMode: v as RunMatchMode,
                })
            " />
        </label>
      </div>

      <div class="rule-card__row rule-card__row--output">
        <span class="rule-card__output-label">פלט:</span>
        <label class="rule-card__field">
          <span>תג:</span>
          <Select
            :modelValue="rule.output.tag"
            :options="
              rule.condition.scope === 'paragraph'
                ? HTML_BLOCK_TAGS
                : HTML_INLINE_TAGS
            "
            class="rule-card__select"
            @update:modelValue="
              (v) => store.updateRuleOutput(rule.id, { tag: v as string })
            " />
        </label>
        <label class="rule-card__field">
          <span>class:</span>
          <InputText
            :modelValue="rule.output.class"
            placeholder="(ריק)"
            class="rule-card__input"
            @update:modelValue="
              (v) => store.updateRuleOutput(rule.id, { class: v as string })
            " />
        </label>
        <label class="rule-card__field rule-card__field--debug">
          <span>Debug:</span>
          <div class="rule-card__debug-row">
            <ToggleSwitch
              :modelValue="rule.output.debug ?? false"
              @update:modelValue="
                (v) => store.updateRuleOutput(rule.id, { debug: v })
              " />
            <span
              v-if="rule.output.debug"
              class="debug-swatch"
              :style="{ background: debugColor(rule.id) }" />
          </div>
        </label>
        <code class="rule-card__preview"
          >&lt;{{ rule.output.tag
          }}{{
            rule.output.class ? ` class="${rule.output.class}"` : ""
          }}&gt;...&lt;/{{ rule.output.tag }}&gt;</code
        >
      </div>
    </div>

    <div class="rules-editor__actions">
      <Button
        label="הוסף כלל פיסקה"
        icon="pi pi-plus"
        size="small"
        @click="store.addRule('paragraph')" />
      <Button
        label="הוסף כלל run"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        @click="store.addRule('run')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useConverterStore } from "../stores/converter.js";
import type { Alignment, TriState, RunMatchMode } from "../types/index.js";
import { HTML_BLOCK_TAGS, HTML_INLINE_TAGS } from "../types/index.js";
import Button from "primevue/button";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";

const store = useConverterStore();

function debugColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `hsl(${h % 360}, 80%, 42%)`;
}

const scopeOptions = [
  { label: "פיסקה", value: "paragraph" },
  { label: "Run (חלק טקסט)", value: "run" },
];

const ALIGNMENT_LABELS: Record<string, string> = {
  right: "ימין",
  left: "שמאל",
  center: "מרכז",
  justify: "מוצדק",
  start: "start",
  end: "end",
};

const alignmentOptions = computed(() => [
  { label: "(כל יישור)", value: "" },
  ...(store.observedAlignments as string[]).map((a) => ({
    label: ALIGNMENT_LABELS[a] ?? a,
    value: a,
  })),
]);

const fontSizeOptions = computed(() => [
  { label: "—", value: "" as string | number },
  ...(store.observedFontSizes as number[]).map((s) => ({
    label: `${s}pt`,
    value: s as string | number,
  })),
]);

const colorOptions = computed(() => [
  { label: "(כל צבע)", value: "" },
  ...(store.observedColors as string[]).map((c) => ({
    label: `#${c}`,
    value: c,
  })),
]);

const fontNameOptions = computed(() => [
  { label: "(כל גופן)", value: "" },
  ...(store.observedFontNames as string[]).map((f) => ({ label: f, value: f })),
]);

const indentOptions = computed(() => [
  { label: "—", value: "" as string | number },
  ...(store.observedIndents as number[]).map((i) => ({
    label: `${i}pt`,
    value: i as string | number,
  })),
]);

const triOptions = [
  { label: "לא חשוב", value: "any" },
  { label: "דרוש", value: "required" },
  { label: "אסור", value: "forbidden" },
];

const runMatchModeOptions = [
  { label: "כל הטקסט", value: "all" },
  { label: "חלק מהטקסט", value: "any" },
];

const styleOptions = computed(() => {
  const names = store.styleNames as string[];
  return [
    { label: "(כל סגנון)", value: "" },
    ...names.map((n) => ({ label: n, value: n })),
  ];
});
</script>

<style scoped>
.rules-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rules-editor__hint {
  margin: 0;
  color: var(--p-surface-600);
  font-size: 0.9rem;
}

.rules-editor__empty {
  padding: 1rem;
  text-align: center;
  color: var(--p-surface-500);
  background: var(--p-surface-50);
  border: 1px dashed var(--p-surface-300);
  border-radius: 6px;
}

.rule-card {
  border: 1px solid var(--p-surface-300);
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--p-surface-0);
}

.rule-card__top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rule-card__index {
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

.rule-card__name {
  flex: 1;
  min-width: 8rem;
}

.rule-card__enabled-label {
  font-size: 0.85rem;
  color: var(--p-surface-600);
}

.rule-card__order {
  display: flex;
  gap: 0.25rem;
}

.rule-card__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}

.rule-card__row--conditions {
  background: var(--p-surface-50);
  padding: 0.5rem;
  border-radius: 4px;
}

.rule-card__row--output {
  align-items: center;
}

.rule-card__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--p-surface-700);
}

.rule-card__select {
  width: 10rem;
}

.rule-card__select--tri {
  width: 7rem;
}

.rule-card__num {
  width: 7rem;
}

.rule-card__input {
  width: 10rem;
}

.rule-card__output-label {
  font-weight: 600;
}

.rule-card__preview {
  font-size: 0.8rem;
  color: var(--p-surface-600);
  background: var(--p-surface-100);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  white-space: nowrap;
  direction: ltr;
  unicode-bidi: embed;
}

.rules-editor__actions {
  display: flex;
  gap: 0.5rem;
}

.rule-card__field--debug {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.rule-card__debug-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.debug-swatch {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.color-option {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.color-swatch {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border-radius: 3px;
  border: 1px solid var(--p-surface-300);
}
</style>
