# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this package is

`@vivliostyle/docx-converter` is a **desktop IDE for Vivliostyle projects** (Electron + Vue 3 + PrimeVue + Pinia + Monaco). A workspace is a directory on disk with a `vivliostyle.config.js`, HTML/Markdown entries, CSS, and assets. The app exposes:

- a file tree and Monaco-based editor for CSS / HTML / Markdown / `vivliostyle.config.js`,
- a GUI form for Vivliostyle config options with bidirectional sync to the file,
- a live preview powered by `vivliostyle preview` running as a child process and rendered in an iframe,
- PDF / EPUB / WebPub export through `vivliostyle build`,
- a DOCX import flow (the original tool's functionality) that converts Word documents into HTML and adds them as entries to the current project.

## Commands

```bash
# Web app (Vite) — barely used; the app is meant to run as Electron
bun dev        # Dev server at http://localhost:5173
bun build      # Production build → dist/

# Electron (electron-vite) — primary mode
bun dev:electron      # main+preload watch build + renderer dev server + spawn Electron
bun build:electron    # Build all three targets → out/
bun package           # Build + package as Windows installer via electron-builder
```

**Restarting after main-process changes**: `bun dev:electron` watches and rebuilds `electron/main/*.ts`, but **does not auto-restart Electron**. After editing main/preload code, stop (Ctrl+C) and restart `bun dev:electron`.

No test suite exists yet. Use `bun x vue-tsc --noEmit` for renderer typechecking. `electron-vite build` is the closest thing to "lint".

## Dual build configuration

Two separate build configs:

- `vite.config.ts` — pure web app build (used by `bun dev` / `bun build`). Renderer-only, no Electron API.
- `electron.vite.config.ts` — three targets: `electron/main/`, `electron/preload/`, and the renderer. Outputs to `out/`.

The renderer is the same Vue app in both modes. Electron-only features are gated on `window.electron` (injected by the preload).

## Layout (renderer)

Three-pane PrimeVue `Splitter` (`src/components/Layout/MainLayout.vue`):

```
┌──────────────┬─────────────────────────┬─────────────────────────┐
│  LeftSidebar │  EditorPanel            │  PreviewPanel           │
│  (accordion) │  (Monaco tabs)          │  (iframe to viv preview)│
└──────────────┴─────────────────────────┴─────────────────────────┘
```

**LeftSidebar accordion sections**:

1. **פרויקט** (`ProjectSection`) — empty state with "open folder" + recent projects, or `FileTree` (PrimeVue Tree).
2. **הגדרות** (`SettingsSection`) — `ConfigForm` (GUI for `vivliostyle.config.js`) with save / reload toolbar.
3. **ייבוא DOCX** (`DocxImportSection`) — the DOCX conversion flow + "Add to project" button.
4. **פעולות** (`ActionsSection`) — Export PDF / EPUB / WebPub.

## Pinia stores (`src/stores/`)

- **`project.ts`** — open project: `rootPath`, file `tree`, `recent` (localStorage), `openProject(path)`, `closeProject`, `refreshTree`. Watches the project directory via chokidar IPC and re-reads the tree on changes.
- **`editor.ts`** — Monaco open files: `openFiles[]` with `{path, content, savedContent, language}`, `activePath`, `isDirty(file)`, `openFile`, `saveFile`, `closeFile`. The `content/savedContent` diff is the dirty signal.
- **`config.ts`** — wraps `vivliostyle.config.js`: loads the file from the project root, parses it via IPC, exposes `data: ConfigData`, `isDirty`, `save()`, `createDefault()`, `addEntry()`. Saving re-parses the existing file and patches known keys via AST so unrecognized fields, comments, and ordering survive.
- **`preview.ts`** — `vivliostyle preview` lifecycle: `start(projectDir)`, `stop()`, `url`, `port`, `logs[]`, `iframeKey` (incremented by `reload()` to force iframe refresh).
- **`build.ts`** — Export options (`format`, `cropMarks`, `bleed`, `pressReady`) and `exportTo(projectDir, outputPath)` which invokes `viv:build` IPC.
- **`converter.ts`** — the DOCX pipeline state (carried over from the original tool). Adds `addToProject(projectDir)`: writes the current `htmlOutput` (embedded images) to `<projectDir>/imported/<docx-basename>.html` and returns the absolute path.

## Electron main process (`electron/main/`)

- **`index.ts`** — window creation, registers all the IPC handler modules below.
- **`fs-handlers.ts`** — `dialog:openDirectory`, `dialog:saveAs(opts)` (generic save-with-filters), `fs:readDir/readFile/writeFile/mkdir/rename/delete/exists`, `fs:watchDir/unwatchDir` (chokidar). `readDir` returns a recursive `FileTreeNode` tree with `.vivliostyle`, `.git`, and `node_modules` filtered out.
- **`file-watcher.ts`** — legacy single-file watcher (still used by the DOCX flow). Project-wide watcher lives in `fs-handlers.ts`.
- **`vivliostyle.ts`** — `viv:preview:start/stop/status` and `viv:build`. Spawns `@vivliostyle/cli` (from `node_modules/@vivliostyle/cli/dist/cli.js`) via `process.execPath` + `ELECTRON_RUN_AS_NODE=1`. Streams stdout/stderr to `viv:log`. Picks a free port (custom port scanner, no `get-port` dep). Resolves the project's `vivliostyle.config.{js,mjs,cjs,ts,json}` and passes it via `-c`.
- **`config-codec.ts`** — Babel-based parser/serializer for `vivliostyle.config.js`. Exposed via `config:parse` and `config:serialize` IPC. Lives in the **main process** because `@babel/types` references `process`, which is undefined in the sandboxed renderer.

## Preview server gotchas

- **stdin must be `'pipe'`, not `'ignore'`** — the Vivliostyle CLI attaches a readline interface to stdin to detect Ctrl+C; a closed stdin makes it shut down immediately ("Closing readline interface" appears in logs, exit code 0).
- **`-c <config-path>` is required** — passing the project directory as a positional argument no longer auto-detects `vivliostyle.config.js` in CLI v10. Use `findConfigFile()` from `vivliostyle.ts`.
- **The iframe URL is not the bare port**. The CLI prints `Preview URL: http://127.0.0.1:<port>/__vivliostyle-viewer/index.html#src=...&bookMode=true&renderAllPages=true`. `vivliostyle.ts` parses this from stdout and returns it to the renderer; the renderer's iframe loads the full URL.
- The CLI does **schema validation** on the config. An `image: "ghcr.io/vivliostyle/cli:<version>"` field mismatched with the installed CLI version fails the whole load — the `image` field is only used for Docker builds; it can be removed safely.

## Config codec (`electron/main/config-codec.ts`)

Round-trips `vivliostyle.config.js` between the form and the source file using `@babel/parser` + `@babel/generator` + `@babel/types`.

- Recognises `export default {...}` / `export default defineConfig({...})` / `module.exports = ...` / `module.exports = defineConfig(...)`.
- Known keys (mapped to form fields): `title`, `author`, `language`, `readingProgression`, `size`, `theme`, `image`, `browser`, `entry`.
- **Unknown keys are preserved untouched** — we don't run user code, we just patch the AST and regenerate. Anything we don't recognise (functions, custom plugins, computed values) stays in the file.
- `entry` is parsed as an array of `{path, title?, theme?, rel?, encodingFormat?}` literals. String entries (`["foo.html"]`) are normalised to `{path: "foo.html"}`.

## Monaco setup (`src/services/monaco-setup.ts`)

- Loads workers via Vite `?worker` imports (`monaco-editor/esm/vs/.../...worker?worker`).
- Forces `direction: ltr` and `box-sizing: content-box` inside `.monaco-editor-host` — the app-wide RTL direction and global `* { box-sizing: border-box }` rule break Monaco's pixel-precise layout (results in invisible text). This is in `App.vue`'s global style.
- A CSP meta tag in `index.html` allows `'unsafe-eval'` (Monaco + Vite HMR), `blob:` workers, and `frame-src http://localhost:* http://127.0.0.1:*` (the preview iframe).

## DOCX conversion pipeline (`src/converter/`)

Unchanged from the original tool. The output is still hooked into the new `DocxImportSection` UI.

1. **`docx-parser.ts`** — Reads the DOCX as a ZIP (JSZip), parses `word/styles.xml` and `word/document.xml`. Returns a `ParsedDocument`.
2. **`rule-matcher.ts`** — First matching enabled `MappingRule` wins.
3. **`html-generator.ts`** — `generateHtmlWithEmbeddedImages` (single file, used by `addToProject` and preview), `generateHtmlWithExternalImages` (ZIP), `generateHtmlFiles` (split-file mode).
4. **`vfm-generator.ts`** — VFM (Markdown) output.
5. **`zip-builder.ts`** — JSZip-backed ZIP packaging.

### OOXML bold/italic gotcha

Hebrew/RTL documents use `<w:bCs>` and `<w:iCs>` for bold/italic, not `<w:b>`/`<w:i>`. A run is RTL when it has `<w:rtl/>` in its `rPr` or `<w:rFonts w:hint="cs"/>`. See `extractRunsFromContainer` in `docx-parser.ts`.

### Style mapping vs. rules

Two layers, evaluated in order:

1. **Rules** (`MappingRule[]`) — ordered list of conditions (style name, alignment, bold/italic/underline/strikethrough tri-state, font size range, color, font name, indent level). First enabled rule wins; sets `{tag, class}`. Targets `"paragraph"` or `"run"`. `output.hidden` suppresses; `output.splitFile` starts a new file.
2. **Style config** (`StyleConfig`) — fallback `{[styleName]: {tag, class, enabled, debug}}` keyed by Word style name. Defaults in `src/types/index.ts → DEFAULT_STYLE_MAPPINGS`.

`{styleConfig, rules}` auto-saves to `localStorage` under `vivliostyle-docx-config`. Legacy configs (only a `StyleConfig` without `rules`) are migrated transparently.

## Image handling

- **DOCX → in-app preview / Add to project**: embedded as `data:image/…` Base64 URIs (single-file HTML).
- **DOCX → ZIP download**: external `images/` folder with `<img src="images/…">`.
- **DOCX → VFM download**: `![](images/…)` markdown syntax.

## Window contract (`src/env.d.ts`)

`window.electron: ElectronAPI` is the single surface for renderer ↔ main. When adding a new IPC channel, update:

1. The main handler (in `electron/main/*.ts`)
2. The preload export (`electron/preload/index.ts`)
3. The `ElectronAPI` interface in `src/env.d.ts`
