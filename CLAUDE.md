# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vivliostyle.js is an open-source HTML+CSS typesetting system with EPUB/Web publications support. The project is a monorepo using Lerna and Bun workspaces, containing three main packages: `@vivliostyle/core` (typesetting engine), `@vivliostyle/viewer` (web UI), and `@vivliostyle/react` (React component).

The core library is based on Peter Sorotokin's EPUB Adaptive Layout implementation and implements a sophisticated CSS paged media layout engine in TypeScript.

## Development Commands

### Setup
```bash
bun install
```

### Build Commands
```bash
bun build           # Build all packages (production)
bun build-dev       # Build all packages (development mode with VIVLIOSTYLE_DEBUG=true)
bun clean           # Clean all build artifacts
```

### Development (Watch Mode)
```bash
bun dev             # Watch mode for core + viewer (excludes react)
bun dev:react       # Watch mode for core + react (excludes viewer)
```

### Package-Specific Commands
```bash
# Core package
cd packages/core
bun build           # Build with esbuild (minified, VIVLIOSTYLE_DEBUG=false)
bun build-dev       # Build with esbuild (unminified, VIVLIOSTYLE_DEBUG=true)
bun dev             # Watch mode (development build)
bun lint            # Run ESLint
bun format          # Run Prettier
bun test            # Run Karma tests in packages/core/test

# Viewer package
cd packages/viewer
bun build           # Build viewer with Gulp + Rollup (production)
bun build-dev       # Build viewer (development mode)
bun dev             # Parallel watch: gulp serve-dev + rollup watch
bun serve           # Build and serve with browser-sync
bun lint            # Run ESLint + Stylelint
bun format          # Run Prettier

# React package
cd packages/react
bun build           # Build with microbundle
bun dev             # Run Storybook on port 9009
bun storybook       # Same as dev
```

### Testing
```bash
bun test            # Run tests for all packages (parallel)

# Core tests specifically (Karma + Jasmine)
cd packages/core/test
bun test            # Run Karma locally
bun test-ci         # Run Karma in CI mode
```

### Linting and Formatting
```bash
bun lint            # Lint all packages
bun format          # Format all packages with Prettier
```

### Release Management
```bash
# Before release
bun lint && bun test && bun clean && bun build

# Version bumping
bun version:bump         # Bump stable version (using conventional commits)
bun version:prerelease   # Create/increment pre-release version
bun version:graduate     # Graduate pre-release to stable
bun version:amend        # Undo last version bump

# Publishing
bun ship                 # Publish from current package versions
bun ship:canary          # Publish canary release
bun ship:prerelease      # Publish prerelease (next tag)
```

## Architecture

### Package Structure

**`@vivliostyle/core`** (`packages/core/`)
- The core typesetting engine implementing CSS Paged Media layout
- Entry point: `src/vivliostyle.ts` exports main API surface
- Build: TypeScript + esbuild → single bundle `lib/vivliostyle.js`
- Key modules (~60 TypeScript files in `src/vivliostyle/`):
  - `adaptive-viewer.ts`: Main viewer implementation coordinating layout
  - `core-viewer.ts`: Public API (CoreViewer class, settings, options)
  - `layout.ts`, `layout-helper.ts`: Page layout algorithm
  - `css-*.ts`: CSS parsing, cascade, styling, validation
  - `vgen.ts`, `vtree.ts`: View generation and view tree
  - `page-floats.ts`, `footnotes.ts`: Float and footnote handling
  - `columns.ts`: Multi-column layout
  - `epub.ts`: EPUB document handling
  - `print.ts`: Print functionality
  - `plugin.ts`: Plugin system

**`@vivliostyle/viewer`** (`packages/viewer/`)
- Web application providing UI for Vivliostyle Core
- Entry point: `src/vivliostyle-viewer.ts`
- Build pipeline: Gulp (SCSS, HTML templating) + Rollup (TypeScript bun dling)
- Uses Knockout.js for MVVM bindings
- Structure:
  - `src/models/`: Data models
  - `src/viewmodels/`: View models (especially `viewer-app.ts`)
  - `src/bindings/`: Custom Knockout bindings
  - `src/stores/`: State management
  - `src/scss/`: Styles
  - `src/html/`: EJS templates
- Development server: browser-sync with live reload

**`@vivliostyle/react`** (`packages/react/`)
- React component wrapper for Vivliostyle Core
- Built with microbundle
- Uses Storybook for development and testing
- Peer dependencies: React 18.2+ or 19.0+

### Key Architectural Concepts

**Adaptive Layout**: The core implements an adaptive layout engine that processes HTML+CSS into paginated views. Key flow:
1. Document loading (`epub.ts`, `net.ts`)
2. CSS parsing and cascade (`css-parser.ts`, `css-cascade.ts`)
3. View generation (`vgen.ts` creates `vtree.ts` view tree)
4. Layout calculation (`layout.ts` positions elements on pages)
5. Rendering via `AdaptiveViewer` class

**Task System**: Asynchronous operations use a custom task/continuation system (`task.ts`, `task-util.ts`) for managing layout operations.

**Plugin System**: Extensible via hooks defined in `plugin.ts` allowing custom layout behavior.

**Debug Mode**: Core can be built with `VIVLIOSTYLE_DEBUG=true` (dev builds) or `false` (production builds) affecting logging and assertions.

### Monorepo Coordination

- Uses Lerna for version management and publishing
- Bun workspaces for dependency hoisting
- `@vivliostyle/viewer` and `@vivliostyle/react` both depend on `@vivliostyle/core` via workspace linking
- After `bun add`, run `lerna link` to recreate symlinks, or use `lerna add` directly

### Testing Strategy

- Core tests: Karma + Jasmine in `packages/core/test/` (separate package with own dependencies)
- Viewer tests: Currently disabled (see issue #618)
- React tests: Build validation only (`test:build`)

## Build System Details

**Core**:
- TypeScript compilation for `.d.ts` generation
- esbuild for bun dling `src/vivliostyle.ts` → `lib/vivliostyle.js`
- Format: CommonJS, Target: ES2018

**Viewer**:
- Gulp processes SCSS → CSS, EJS → HTML
- Rollup bundles TypeScript → `lib/js/vivliostyle-viewer.js`
- Environment-aware builds via `NODE_ENV` and `VIVLIOSTYLE_VERSION`

**React**:
- Microbundle creates modern + CJS formats
- Uses Bun runtime (`bun x --bun `) for build commands

## Naming Conventions

From CONTRIBUTING.md:
- Class names match file names (PascalCase class, kebab-case file)
- Module imports use PascalCase, files use kebab-case
- No abbreviations except initialisms (EPUB, PDF) or very lengthy names

## Commit Guidelines

Follow Conventional Commits specification. All notable changes documented in CHANGELOG.md via conventional commits (used by `lerna version --conventional-commits`).

## Node Version

Requires Node.js >= 20 (specified in all package.json `engines` field).

## License

AGPL-3.0 (all packages). Core is based on Apache 2.0 licensed adaptive-layout code.
