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
2. **`html-generator.ts`** — Takes a `ParsedDocument` + `StyleConfig` and produces an HTML string. Each run is wrapped in inline tags (`<strong>`, `<em>`, `<u>`, `<s>`); paragraphs are wrapped in the user-chosen tag with optional class.
3. **`zip-builder.ts`** — Packages HTML + image files into a ZIP blob using JSZip.

### OOXML bold/italic gotcha

Hebrew/RTL documents use `<w:bCs>` and `<w:iCs>` for bold/italic, **not** `<w:b>`/`<w:i>`. A run is detected as RTL when it has `<w:rtl/>` in its `rPr` or `<w:rFonts w:hint="cs"/>`. Bold/italic detection branches on this flag — see `extractRunsFromContainer` in `docx-parser.ts`.

### State (`src/stores/converter.ts`)

Single Pinia store holds: uploaded file, parsed document, style config map, HTML output, and display options (include colors, include font sizes). Style config auto-saves to `localStorage` under the key `vivliostyle-docx-config`.

### Style mapping

`StyleConfig` is a plain `{ [styleName: string]: { tag: string; class: string } }` object. Style names come directly from `<w:style><w:name>` in the DOCX's `styles.xml`, so they match what the author sees in Word (e.g. "Heading 1", "Body Text"). Unknown styles fall back to `<p class="{kebab-style-id}">`. Defaults are in `src/types/index.ts → DEFAULT_STYLE_MAPPINGS`.

### Image handling

- **HTML download**: images embedded as `data:image/…` Base64 URIs.
- **ZIP download**: images written to an `images/` folder; `<img src="images/…">` in the HTML.
