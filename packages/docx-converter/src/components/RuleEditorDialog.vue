<template>
  <Dialog
    :visible="visible"
    modal
    :header="rule?.name || 'עריכת כלל'"
    :style="{ width: '700px', maxWidth: '95vw' }"
    :dir="'rtl'"
    @update:visible="(v) => emit('update:visible', v)">
    <div v-if="rule" class="rule-dialog">
      <div class="rule-dialog__row">
        <label class="rule-dialog__field rule-dialog__field--wide">
          <span>שם הכלל:</span>
          <InputText
            :modelValue="rule.name"
            placeholder="שם הכלל"
            @update:modelValue="
              (v) => store.updateRule(rule!.id, { name: v })
            " />
        </label>
        <label class="rule-dialog__field">
          <span>טווח:</span>
          <Select
            :modelValue="rule.condition.scope"
            :options="scopeOptions"
            optionLabel="label"
            optionValue="value"
            @update:modelValue="
              (v) =>
                store.updateRuleCondition(rule!.id, {
                  scope: v as 'paragraph' | 'run',
                })
            " />
        </label>
      </div>

      <fieldset class="rule-dialog__section">
        <legend>תנאים</legend>
        <div class="rule-dialog__grid">
          <label class="rule-dialog__field">
            <span>שם סגנון:</span>
            <Select
              :modelValue="rule.condition.styleName ?? ''"
              :options="styleOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    styleName: v ? (v as string) : undefined,
                  })
              " />
          </label>

          <label class="rule-dialog__field">
            <span>יישור:</span>
            <Select
              :modelValue="rule.condition.alignment ?? ''"
              :options="alignmentOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    alignment: v ? (v as Alignment) : undefined,
                  })
              " />
          </label>

          <label class="rule-dialog__field">
            <span>גודל גופן מינ' (pt):</span>
            <Select
              :modelValue="rule.condition.fontSizeMin ?? ''"
              :options="fontSizeOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    fontSizeMin: v === '' ? undefined : (v as number),
                  })
              " />
          </label>

          <label class="rule-dialog__field">
            <span>גודל גופן מקס' (pt):</span>
            <Select
              :modelValue="rule.condition.fontSizeMax ?? ''"
              :options="fontSizeOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    fontSizeMax: v === '' ? undefined : (v as number),
                  })
              " />
          </label>

          <label class="rule-dialog__field">
            <span>בולד:</span>
            <Select
              :modelValue="rule.condition.bold ?? 'any'"
              :options="triOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    bold: v === 'any' ? undefined : (v as TriState),
                  })
              " />
          </label>

          <label class="rule-dialog__field">
            <span>נטוי:</span>
            <Select
              :modelValue="rule.condition.italic ?? 'any'"
              :options="triOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    italic: v === 'any' ? undefined : (v as TriState),
                  })
              " />
          </label>

          <label class="rule-dialog__field">
            <span>קו תחתון:</span>
            <Select
              :modelValue="rule.condition.underline ?? 'any'"
              :options="triOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    underline: v === 'any' ? undefined : (v as TriState),
                  })
              " />
          </label>

          <label class="rule-dialog__field">
            <span>קו חוצה:</span>
            <Select
              :modelValue="rule.condition.strikethrough ?? 'any'"
              :options="triOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    strikethrough: v === 'any' ? undefined : (v as TriState),
                  })
              " />
          </label>

          <label class="rule-dialog__field">
            <span>צבע:</span>
            <Select
              :modelValue="rule.condition.color ?? ''"
              :options="colorOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
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

          <label class="rule-dialog__field">
            <span>שם גופן:</span>
            <Select
              :modelValue="rule.condition.fontName ?? ''"
              :options="fontNameOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    fontName: v ? (v as string) : undefined,
                  })
              " />
          </label>

          <label
            v-if="rule.condition.scope === 'paragraph'"
            class="rule-dialog__field">
            <span>indent מינ' (pt):</span>
            <Select
              :modelValue="rule.condition.indentMin ?? ''"
              :options="indentOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    indentMin: v === '' ? undefined : (v as number),
                  })
              " />
          </label>

          <label
            v-if="rule.condition.scope === 'paragraph'"
            class="rule-dialog__field">
            <span>התאמת runs:</span>
            <Select
              :modelValue="rule.condition.runMatchMode ?? 'all'"
              :options="runMatchModeOptions"
              optionLabel="label"
              optionValue="value"
              @update:modelValue="
                (v) =>
                  store.updateRuleCondition(rule!.id, {
                    runMatchMode: v as RunMatchMode,
                  })
              " />
          </label>
        </div>
      </fieldset>

      <fieldset class="rule-dialog__section">
        <legend>פלט</legend>
        <div class="rule-dialog__grid">
          <label class="rule-dialog__field rule-dialog__field--row">
            <span>הסתר תוכן:</span>
            <ToggleSwitch
              :modelValue="rule.output.hidden ?? false"
              @update:modelValue="
                (v) => store.updateRuleOutput(rule!.id, { hidden: v })
              " />
          </label>

          <template v-if="!rule.output.hidden">
            <label class="rule-dialog__field">
              <span>תג:</span>
              <Select
                :modelValue="rule.output.tag"
                :options="
                  rule.condition.scope === 'paragraph'
                    ? HTML_BLOCK_TAGS
                    : HTML_INLINE_TAGS
                "
                @update:modelValue="
                  (v) => store.updateRuleOutput(rule!.id, { tag: v as string })
                " />
            </label>
            <label class="rule-dialog__field">
              <span>class:</span>
              <InputText
                :modelValue="rule.output.class"
                placeholder="(ריק)"
                @update:modelValue="
                  (v) =>
                    store.updateRuleOutput(rule!.id, { class: v as string })
                " />
            </label>
            <label
              v-if="rule.condition.scope === 'paragraph'"
              class="rule-dialog__field rule-dialog__field--row">
              <span>פצל לקובץ:</span>
              <ToggleSwitch
                :modelValue="rule.output.splitFile ?? false"
                @update:modelValue="
                  (v) => store.updateRuleOutput(rule!.id, { splitFile: v })
                " />
            </label>
          </template>
        </div>

        <code v-if="!rule.output.hidden" class="rule-dialog__preview"
          >&lt;{{ rule.output.tag
          }}{{
            rule.output.class ? ` class="${rule.output.class}"` : ""
          }}&gt;...&lt;/{{ rule.output.tag }}&gt;</code
        >
        <code v-else class="rule-dialog__preview rule-dialog__preview--hidden"
          >&lt;!-- מוסתר --&gt;</code
        >
      </fieldset>
    </div>

    <template #footer>
      <Button label="סגור" @click="emit('update:visible', false)" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useConverterStore } from "../stores/converter.js";
import type { Alignment, TriState, RunMatchMode } from "../types/index.js";
import { HTML_BLOCK_TAGS, HTML_INLINE_TAGS } from "../types/index.js";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";

const props = defineProps<{ visible: boolean; ruleId: string | null }>();
const emit = defineEmits<{ "update:visible": [v: boolean] }>();

const store = useConverterStore();

const rule = computed(() =>
  props.ruleId
    ? (store.rules.find((r) => r.id === props.ruleId) ?? null)
    : null,
);

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
.rule-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rule-dialog__row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.rule-dialog__section {
  border: 1px solid var(--p-surface-300);
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rule-dialog__section legend {
  font-weight: 600;
  padding: 0 0.4rem;
}

.rule-dialog__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.75rem;
}

.rule-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--p-surface-700);
}

.rule-dialog__field--row {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.rule-dialog__field--wide {
  flex: 1;
  min-width: 14rem;
}

.rule-dialog__preview {
  font-size: 0.8rem;
  color: var(--p-surface-600);
  background: var(--p-surface-100);
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  direction: ltr;
  unicode-bidi: embed;
  align-self: flex-start;
}

.rule-dialog__preview--hidden {
  color: var(--p-surface-500);
  font-style: italic;
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
