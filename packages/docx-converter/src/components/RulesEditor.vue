<template>
  <div class="rules-editor">
    <p class="rules-editor__hint">
      הכלל הראשון שתואם לפיסקה או ל-run "ניצח" וקובע את התג ו-class. אם שום כלל
      לא תואם — חוזרים לברירות המחדל לפי שם הסגנון.
    </p>

    <div v-if="store.rules.length === 0" class="rules-editor__empty">
      אין כללים. הוסף כלל כדי למפות פיסקאות או runs לפי שילוב של תכונות.
    </div>

    <div
      v-for="(rule, idx) in store.rules"
      :key="rule.id"
      class="rule-row"
      :class="{ 'rule-row--disabled': !rule.enabled }">
      <span class="rule-row__index">{{ idx + 1 }}</span>

      <div class="rule-row__main">
        <div class="rule-row__name">{{ rule.name || "(ללא שם)" }}</div>
        <div class="rule-row__summary">{{ summarize(rule) }}</div>
      </div>

      <span
        class="rule-row__count"
        :class="{ 'rule-row__count--zero': matchCount(rule.id) === 0 }">
        {{ matchCount(rule.id) }} מופעים
      </span>

      <div class="rule-row__toggle">
        <ToggleSwitch
          :modelValue="rule.enabled"
          @update:modelValue="
            (v) => store.updateRule(rule.id, { enabled: v })
          " />
        <span>פעיל</span>
      </div>

      <div class="rule-row__toggle">
        <ToggleSwitch
          :modelValue="rule.output.debug ?? false"
          @update:modelValue="
            (v) => store.updateRuleOutput(rule.id, { debug: v })
          " />
        <span
          v-if="rule.output.debug"
          class="debug-swatch"
          :style="{ background: debugColor(rule.id) }" />
        <span>Debug</span>
      </div>

      <div class="rule-row__actions">
        <Button
          icon="pi pi-pencil"
          severity="secondary"
          size="small"
          text
          v-tooltip.bottom="'ערוך'"
          @click="openEdit(rule.id)" />
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
        <Button
          icon="pi pi-trash"
          severity="danger"
          size="small"
          text
          @click="store.removeRule(rule.id)" />
      </div>
    </div>

    <div class="rules-editor__actions">
      <Button
        label="הוסף כלל פיסקה"
        icon="pi pi-plus"
        size="small"
        @click="addAndEdit('paragraph')" />
      <Button
        label="הוסף כלל run"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        @click="addAndEdit('run')" />
    </div>

    <RuleEditorDialog v-model:visible="dialogVisible" :rule-id="editingId" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useConverterStore } from "../stores/converter.js";
import type { MappingRule } from "../types/index.js";
import Button from "primevue/button";
import ToggleSwitch from "primevue/toggleswitch";
import RuleEditorDialog from "./RuleEditorDialog.vue";

const store = useConverterStore();

const dialogVisible = ref(false);
const editingId = ref<string | null>(null);

function openEdit(id: string): void {
  editingId.value = id;
  dialogVisible.value = true;
}

function addAndEdit(scope: "paragraph" | "run"): void {
  const r = store.addRule(scope);
  openEdit(r.id);
}

function matchCount(id: string): number {
  return store.ruleMatchCounts[id] ?? 0;
}

function debugColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `hsl(${h % 360}, 80%, 42%)`;
}

const ALIGNMENT_LABELS: Record<string, string> = {
  right: "ימין",
  left: "שמאל",
  center: "מרכז",
  justify: "מוצדק",
  start: "start",
  end: "end",
};

const TRI_LABELS: Record<string, string> = {
  required: "דרוש",
  forbidden: "אסור",
};

function summarize(rule: MappingRule): string {
  const parts: string[] = [];
  parts.push(rule.condition.scope === "paragraph" ? "פיסקה" : "run");
  const c = rule.condition;
  if (c.styleName) parts.push(`סגנון: ${c.styleName}`);
  if (c.alignment)
    parts.push(`יישור: ${ALIGNMENT_LABELS[c.alignment] ?? c.alignment}`);
  if (c.bold && c.bold !== "any") parts.push(`בולד ${TRI_LABELS[c.bold]}`);
  if (c.italic && c.italic !== "any")
    parts.push(`נטוי ${TRI_LABELS[c.italic]}`);
  if (c.underline && c.underline !== "any")
    parts.push(`קו תחתון ${TRI_LABELS[c.underline]}`);
  if (c.strikethrough && c.strikethrough !== "any")
    parts.push(`קו חוצה ${TRI_LABELS[c.strikethrough]}`);
  if (c.fontSizeMin !== undefined && c.fontSizeMax !== undefined)
    parts.push(`גודל ${c.fontSizeMin}–${c.fontSizeMax}pt`);
  else if (c.fontSizeMin !== undefined) parts.push(`גודל ≥ ${c.fontSizeMin}pt`);
  else if (c.fontSizeMax !== undefined) parts.push(`גודל ≤ ${c.fontSizeMax}pt`);
  if (c.color) parts.push(`צבע #${c.color}`);
  if (c.fontName) parts.push(`גופן: ${c.fontName}`);
  if (c.indentMin !== undefined) parts.push(`indent ≥ ${c.indentMin}pt`);

  const o = rule.output;
  let out: string;
  if (o.hidden) out = "מוסתר";
  else {
    const cls = o.class ? `.${o.class}` : "";
    out = `<${o.tag}${cls}>`;
    if (o.splitFile) out += " · פיצול לקובץ";
  }
  return `${parts.join(" · ")} → ${out}`;
}
</script>

<style scoped>
.rules-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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

.rule-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--p-surface-300);
  border-radius: 6px;
  background: var(--p-surface-0);
}

.rule-row--disabled {
  opacity: 0.55;
}

.rule-row__index {
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
  flex-shrink: 0;
}

.rule-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.rule-row__name {
  font-weight: 600;
  font-size: 0.95rem;
}

.rule-row__summary {
  font-size: 0.8rem;
  color: var(--p-surface-600);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-row__count {
  font-size: 0.8rem;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}

.rule-row__count--zero {
  color: var(--p-surface-500);
}

.rule-row__toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--p-surface-700);
  flex-shrink: 0;
}

.rule-row__actions {
  display: flex;
  gap: 0.15rem;
  flex-shrink: 0;
}

.debug-swatch {
  display: inline-block;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.rules-editor__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
</style>
