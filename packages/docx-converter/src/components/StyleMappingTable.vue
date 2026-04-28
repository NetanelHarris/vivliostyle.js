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
            <span class="style-name">{{ data.styleName }}</span>
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
  })),
);
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

.tag-select {
  width: 9rem;
}

.class-input {
  width: 12rem;
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
