# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The codebase uses jj instead of git.

## What is Bytebook

Bytebook is a desktop note-taking app for developers built with [Wails v3](https://github.com/wailsapp/wails) (Go backend + React frontend). Notes are stored as Markdown files on disk. The app supports code execution via Jupyter kernels (Python, Go, JavaScript, Java), full-text search via Bleve, and a rich editor built on Lexical.

**Note:** The project uses a local fork of Wails v3. `go.mod` has a `replace` directive pointing to `../wails/v3` — the sibling `wails/` directory must exist for Go builds to work.

## Commands

### Running the app (development)

```bash
# From the repo root
wails3 dev --port 5173
# or via task
task dev
```

### Go backend

```bash
# Run all tests (with caching)
gotestsum --format=pkgname --format-icons=hivis ./internal/...

# Run all tests (no cache)
gotestsum --format=pkgname --format-icons=hivis -- -count=1 ./internal/...

# Build
task build
```

### Frontend (React/TypeScript)

```bash
cd frontend

# Install dependencies
bun install

# Type-check (uses tsgo / TypeScript native preview)
bun run tsgo

# Lint
bun run lint:check

# Format check
bun run format:check

# Run all three in sequence
bun run format:lint:tsgo
```

## Architecture

### Two-process model

The app is a Wails v3 desktop app. The Go process runs the backend; the frontend is a React SPA served from the embedded `frontend/dist` asset bundle (in dev mode Vite serves it at port 5173). Communication happens through:

- **Wails service bindings** — Go structs with exported methods are registered as `application.Service` instances in `main.go`. Wails auto-generates TypeScript bindings into `frontend/bindings/`. The frontend imports and calls these directly (e.g., `SetNoteMarkdown(...)` from `bindings/.../noteservice`).
- **Wails events** — bidirectional event bus. All event name strings are centrally defined in `internal/util/events.go`. The backend emits events (e.g., file watcher changes) and the frontend listens with `useWailsEvent()` (`frontend/src/hooks/events.tsx`).

### Go backend (`internal/`)

| Package             | Responsibility                                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/`           | Project path resolution, settings JSON R/W, kernel connection config                                                                                                                                           |
| `notes/`            | Markdown R/W, file tree queries, file watcher, attachment tags                                                                                                                                                 |
| `search/`           | Bleve full-text index: creation, indexing all files, query construction, sorting, saved searches                                                                                                               |
| `events/`           | Listens to Wails app events and updates the search index / triggers UI refreshes                                                                                                                               |
| `services/`         | Wails service structs (`NoteService`, `FolderService`, `FileTreeService`, `SearchService`, `SettingsService`, `TagsService`, `CodeService`, `NodeService`) — these are the RPC surface exposed to the frontend |
| `jupyter_protocol/` | Jupyter messaging protocol implementation; ZeroMQ socket management for kernel communication                                                                                                                   |
| `ui/`               | Window creation and native menus                                                                                                                                                                               |
| `util/`             | Shared helpers: event name constants, file I/O, formatting, concurrency, SPA middleware                                                                                                                        |

The data directory is `~/Library/Application Support/Bytebook/` (macOS only currently). Notes live in a `notes/` subdirectory, structured as `notes/<folder>/<note>.md`.

### React frontend (`frontend/src/`)

**Routing:** `wouter` handles client-side routing. Routes are defined in `utils/routes.ts` (`routeUrls`). The main routes are:

- `/notes/*` — note or folder view (dispatched by `EditorWrapper`)
- `/search` — full-text search
- `/saved-search/:searchQuery/*` — saved search / tag filter view
- `/kernels/:kernelName` — kernel info

**State management:**

- **Jotai atoms** (`atoms.ts`) — UI state: file tree data, sidebar selections, project settings, dialog/context-menu state, kernel statuses. Most atoms use a custom `atomWithLogging` wrapper that logs state transitions.
- **TanStack Query** — server state (notes content, folder listings, search results). Query keys follow `['resource-name', ...identifiers]` conventions.

**Editor:** Built on Lexical (`@lexical/react`). Key pieces:

- `components/editor/index.tsx` (`NotesEditor`) — the editor shell
- `components/editor/plugins/save.tsx` — dispatches `SAVE_MARKDOWN_CONTENT` Lexical command which converts to Markdown and calls `SetNoteMarkdown` backend binding
- `components/editor/nodes/` — custom Lexical nodes (code blocks, files/attachments, inline equations, links)
- `components/editor/plugins/` — custom plugins (code execution, file picker, draggable blocks, table of contents, etc.)
- `components/editor/transformers/` — custom Markdown ↔ Lexical transformers

**File tree:** `components/virtualized/virtualized-file-tree/` renders a lazy-loaded, virtualized tree using `react-virtuoso`. Tree state (a `Map<id, FileOrFolder>`) lives in `fileTreeDataAtom`.

**FilePath / FolderPath:** `utils/path.ts` exports `createFilePath()` and `createFolderPath()` factory functions that return typed path objects (`FilePath` / `FolderPath`). These are used throughout instead of raw strings. (`LocalFilePath` class is the legacy version — prefer the `FilePath` interface going forward.)

**Backend response pattern:** All backend calls return `BackendResponseWithData<T>` or `BackendResponseWithoutData` (defined in `internal/config/project.go`):

```go
type BackendResponseWithData[T any] struct {
    Success bool   `json:"success"`
    Message string `json:"message"`
    Data    T      `json:"data"`
}
```

### Key libraries

| Layer                   | Library                                | Purpose                         |
| ----------------------- | -------------------------------------- | ------------------------------- |
| Frontend editor         | `lexical` / `@lexical/react`           | Rich text editor framework      |
| Frontend code blocks    | `@uiw/react-codemirror` + CodeMirror 6 | Syntax-highlighted code editing |
| Frontend state          | `jotai`                                | Atom-based UI state             |
| Frontend server state   | `@tanstack/react-query`                | Async data fetching/caching     |
| Frontend routing        | `wouter`                               | Lightweight client-side routing |
| Frontend animation      | `motion` (Motion One)                  | Animations                      |
| Frontend virtualization | `react-virtuoso`                       | Virtualized lists               |
| Frontend styling        | Tailwind CSS v4                        | Utility-first CSS               |
| Backend search          | `github.com/blevesearch/bleve/v2`      | Full-text search index          |
| Backend file events     | `github.com/fsnotify/fsnotify`         | File system watcher             |
| Backend kernel comms    | `github.com/pebbe/zmq4`                | ZeroMQ for Jupyter protocol     |
