<template>
  <div class="style-mapping">
    <div class="style-mapping__options">
      <div class="style-mapping__option">
        <ToggleSwitch v-model="store.includeColors" inputId="colors" />
        <label for="colors">כלול צבעים</label>
      </div>
      <div class="style-mapping__option">
        <ToggleSwitch v-model="store.includeFontSizes" inputId="fontsizes" />
        <label for="fontsizes">כלול גדלי פונט</label>
      </div>
    </div>

    <div class="style-mapping__table-wrapper">
      <DataTable
        :value="rows"
        class="style-mapping__table"
        size="small"
        stripedRows>
        <Column field="styleName" header="שם סגנון Word">
          <template #body="{ data }">
            <span
              class="style-name"
              :class="{ 'style-name--disabled': !data.enabled }"
              >{{ data.styleName }}</span
            >
          </template>
        </Column>

        <Column header="פעיל">
          <template #body="{ data }">
            <ToggleSwitch
              :modelValue="data.enabled"
              @update:modelValue="
                (val) => store.updateMapping(data.styleName, { enabled: val })
              " />
          </template>
        </Column>

        <Column header="תג HTML">
          <template #body="{ data }">
            <Select
              :modelValue="data.tag"
              :options="HTML_TAGS"
              class="tag-select"
              @update:modelValue="
                (val) => store.updateMapping(data.styleName, { tag: val })
              " />
          </template>
        </Column>

        <Column header="CSS Class">
          <template #body="{ data }">
            <InputText
              :modelValue="data.class"
              placeholder="(ריק)"
              class="class-input"
              @update:modelValue="
                (val) => store.updateMapping(data.styleName, { class: val })
              " />
          </template>
        </Column>

        <Column header="תצוגה מקדימה">
          <template #body="{ data }">
            <code class="tag-preview"
              >&lt;{{ data.tag
              }}{{ data.class ? ` class="${data.class}"` : "" }}&gt;...&lt;/{{
                data.tag
              }}&gt;</code
            >
          </template>
        </Column>

        <Column header="Debug">
          <template #body="{ data }">
            <div class="debug-cell">
              <ToggleSwitch
                :modelValue="data.debug"
                @update:modelValue="
                  (val) => store.updateMapping(data.styleName, { debug: val })
                " />
              <span
                v-if="data.debug"
                class="debug-swatch"
                :style="{ background: debugColor(data.styleName) }" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useConverterStore } from "../stores/converter.js";
import { HTML_TAGS } from "../types/index.js";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";

const store = useConverterStore();

const rows = computed(() =>
  store.styleNames.map((name) => ({
    styleName: name,
    tag: store.styleConfig[name]?.tag ?? "p",
    class: store.styleConfig[name]?.class ?? "",
    enabled: store.styleConfig[name]?.enabled !== false,
    debug: store.styleConfig[name]?.debug ?? false,
  })),
);

function debugColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `hsl(${h % 360}, 80%, 42%)`;
}
</script>

<style scoped>
.style-mapping__options {
  margin-bottom: 1rem;
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.style-mapping__option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.style-mapping__table-wrapper {
  overflow-x: auto;
}

.style-mapping__table {
  width: 100%;
}

.style-name {
  font-weight: 500;
}

.style-name--disabled {
  opacity: 0.4;
  text-decoration: line-through;
}

.tag-select {
  width: 9rem;
}

.class-input {
  width: 12rem;
}

.debug-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.debug-swatch {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.tag-preview {
  font-size: 0.8rem;
  color: var(--p-surface-600);
  background: var(--p-surface-100);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  white-space: nowrap;
  direction: ltr;
  unicode-bidi: embed;
}
</style>
