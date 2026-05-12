# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev        # Vite dev server at http://localhost:5173
bun build      # Production build → dist/
bun preview    # Serve the production build locally
```

No test suite exists yet. TypeScript errors are surfaced live by the IDE (LSP) and at build time by Vite.

## Architecture

The app is a single-page Vue 3 + PrimeVue + Pinia tool: upload a DOCX → map its paragraph styles to HTML tags/classes → preview and download the result.

### Conversion pipeline (`src/converter/`)

1. **`docx-parser.ts`** — Reads the DOCX as a ZIP (via JSZip), parses `word/styles.xml` for style name resolution and `word/document.xml` for content. Returns a `ParsedDocument` with typed paragraphs, runs, footnotes, and image blobs.
2. **`rule-matcher.ts`** — Evaluates `MappingRule[]` against a paragraph or run. First matching enabled rule wins; returns `null` if none match. Called by the HTML generator before falling back to `styleConfig`.
3. **`html-generator.ts`** — Takes a `ParsedDocument` + `StyleConfig` + `MappingRule[]` and produces an HTML string. For each paragraph/run it tries rules first (`rule-matcher.ts`), then falls back to style-name mapping. Each run is wrapped in inline tags (`<strong>`, `<em>`, `<u>`, `<s>`); paragraphs are wrapped in the user-chosen tag with optional class.
4. **`vfm-generator.ts`** — Alternative output path: produces Vivliostyle Flavored Markdown (VFM) instead of HTML. Uses the same `styleConfig` for tag resolution but ignores `rules`. Supports headings, blockquotes, code blocks, lists, footnotes, and inline formatting.
5. **`zip-builder.ts`** — Packages HTML + image files into a ZIP blob using JSZip.

### OOXML bold/italic gotcha

Hebrew/RTL documents use `<w:bCs>` and `<w:iCs>` for bold/italic, **not** `<w:b>`/`<w:i>`. A run is detected as RTL when it has `<w:rtl/>` in its `rPr` or `<w:rFonts w:hint="cs"/>`. Bold/italic detection branches on this flag — see `extractRunsFromContainer` in `docx-parser.ts`.

### State (`src/stores/converter.ts`)

Single Pinia store holds: uploaded file, parsed document, style config map, rules list, HTML output, VFM output, and display options (include colors, include font sizes). The full config (`styleConfig` + `rules`) auto-saves to `localStorage` under the key `vivliostyle-docx-config`. Legacy configs that contain only a `StyleConfig` (no `rules` key) are migrated transparently on load.

### Style mapping vs. rules

There are two layers of mapping, evaluated in order:

1. **Rules** (`MappingRule[]`) — ordered list of conditions (scope, style name, alignment, bold/italic/underline/strikethrough tri-state, font size range, color, font name, indent). First enabled rule that matches wins and sets `{ tag, class }`. Rules can target either `"paragraph"` or `"run"` scope.
2. **Style config** (`StyleConfig`) — fallback `{ [styleName]: { tag, class, enabled, debug } }` keyed by Word style name. Style names come directly from `<w:style><w:name>` in `styles.xml`. Unknown styles fall back to `<p class="{kebab-style-id}">`. Defaults are in `src/types/index.ts → DEFAULT_STYLE_MAPPINGS`.

The persisted shape is `FullConfig { styleConfig, rules }` (defined in `src/types/index.ts`).

### Image handling

- **HTML download**: images embedded as `data:image/…` Base64 URIs.
- **ZIP download**: images written to an `images/` folder; `<img src="images/…">` in the HTML.
- **VFM download**: images referenced as `![](images/…)` markdown syntax.
