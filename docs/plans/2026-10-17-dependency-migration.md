# Bytebook dependency migration and simplification plan

Date: 2026-10-17. Status: proposed. Application and dependency changes have not been applied.

Modernize the dependencies in `/Users/etesam/Coding/bytebook-w2`, then remove duplicated editor lifecycle, selection, and DOM-anchor machinery. The composer, history-signal, post-commit callback, and selection-snapshot API excerpts were typechecked in an isolated temporary harness against the published Lexical 0.52 declarations. Full-application compatibility is established during the commit gates below.

The strongest reductions come from Lexical extensions and history signals, an existing React external-store primitive, and reusing the note-container element already owned by `NotesEditor`. Several attractive new library components would increase integration work without removing the domain logic Bytebook needs.

## Scope and execution

- Execute one commit at a time. Implement its changes, run its gates, inspect its diff, and use a path-scoped `jj commit -m "<title>" <files...>`. Report the change ID and next entry before continuing. Repository Jujutsu guidance overrides the skill's generic Git commands.
- Preserve the six existing modified files: the three tree test files and `model/rename.ts`, plus `internal/ingest/import_coordinator.go` and its test. They belong to the earlier testing tasks. Do not include those changes in these commits.
- The inspected base is parent `e92a0d50`, working change `yssyxyvk`. Refresh `jj status` before execution; excerpts must be rebased onto any subsequent user edits.
- Dependency commits include the generated [frontend/bun.lock](/Users/etesam/Coding/bytebook-w2/frontend/bun.lock) or [go.sum](/Users/etesam/Coding/bytebook-w2/go.sum). Regenerate locks with the package manager; do not hand-edit integrity entries.
- Use the existing 17 Playwright workflows. Do not create individual overlay, focus, geometry, animation, or version-check E2E specs. Extend an owning workflow only for an observable completed task.
- Commands below run from the repository root unless a subshell explicitly enters `frontend`. `bun check:fe` and `bun check:be` are the required aggregate gates for their respective layers.
- Browser mocks establish frontend save/load behavior, not disk persistence or native Wails window behavior. Wails changes need a desktop smoke check as well.

## Decisions from the code audit

| Area                 | Actual implementation                                                                                                                   | Decision                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Editor setup         | `LexicalComposer`, a central node list, and numerous registration-only React plugins                                                    | Move to a stable module-scoped root extension; retain UI-bearing and note-specific plugins.                                               |
| Toolbar geometry     | `updateToolbar` reads DOM selection from `SELECTION_CHANGE_COMMAND`; the placeholder already uses an update listener                    | Move DOM reads onto the committed editor state. Use one owner for toolbar/placeholder refresh.                                            |
| History availability | Two local booleans, two setter props, and command listeners                                                                             | Read `HistoryExtension` signals directly.                                                                                                 |
| Node selection       | A custom effect walks every selected node; switching to another node never explicitly resets the previous `true`                        | Subscribe to a boolean snapshot using `useSyncExternalStore`. Preserve node-selection-only semantics.                                     |
| Portal anchors       | `NotesEditor` already owns `editorAnchorElem`; three `useRefState` callers independently resample the same ref via microtasks           | Pass the existing element down and delete `useRefState`.                                                                                  |
| Link previews        | Lexical creates anchors outside React; delegated pointer events coexist with selection-preserving link editing                          | Keep the native-to-React event bridge. Evaluate only the positioning layer for a later RAC Popover simplification.                        |
| Tags                 | Multi-note counts, partial selection, overrides against refetched data, and unsaved tag creation                                        | Keep the domain model. TokenField alpha does not replace partial-selection semantics.                                                     |
| File tree            | Pierre owns models, shadow DOM rows, keyboard interaction, and context-menu lifecycle                                                   | Keep Pierre. This checkout has no tree-animation adapter to replace. NavigationTree is not a filesystem-tree migration.                   |
| Queries              | Existing `queryOptions` conventions and response helpers; no `fetchQuery`, `ensureQueryData`, or `prefetchQuery` callers found in `src` | Upgrade Query without inventing a wrapper around its new imperative APIs.                                                                 |
| Formatting           | Plain text persistence uses custom Markdown transformers; code execution results use sidecars                                           | Preserve Markdown and sidecar contracts. Do not switch persistence to compact Lexical JSON.                                               |
| Search               | Existing Bleve query construction already expresses boosts, prefixes, and regex searches                                                | Upgrade separately from ranking changes. Custom score callbacks are a new product capability, not a simpler substitute for these queries. |
| Wails                | Go uses `replace ... => ../wails/v3`; CI clones beta.9; the local fork already has panels and notch windows                             | Audit the fork before choosing a new tag or runtime. A manifest-only bump cannot establish compatibility.                                 |

## Compatibility boundaries

1. **Keep ESLint on 9 for this migration.** The published `eslint-plugin-react@7.37.5` peer range ends at `^9.7`; ESLint 10 requires resolving that plugin boundary first. Avoid forcing an incompatible peer tree or replacing the whole ruleset merely to obtain the latest major. The hooks plugin and typescript-eslint can be updated within this boundary.
2. **Keep the JavaScript TypeScript API for type-aware ESLint.** Native TypeScript 7 is a separate CLI concern. Replace the dated native preview with a deliberately named npm alias for TypeScript 7, while retaining the `typescript` package used by ESLint. Do not assume TypeScript 7 exposes the TypeScript 5/6 API.
3. **Preserve React Compiler behavior when upgrading plugin-react.** Version 6 removes `react({ babel: ... })`. The documented Babel preset route is the default plan; the smaller native Oxc route remains an explicit experiment.
4. **Upgrade Lexical packages together to 0.52.0.** Review selection notification timing, JSON imports applying node replacements, ESM packaging, and the deprecation of `LexicalComposer`. Keep the Markdown round-trip tests as the main serialization contract.
5. **Keep CodeMirror's shared-instance protection.** Bump its three exact overrides together. The version dedupe configuration and lazy grammar preloading solve separate problems and stay in place.
6. **Raise the Go baseline explicitly before the latest `x/sync` and `x/text`.** These target versions require Go 1.26; CI reads the version from `go.mod`.
7. **Keep Node declarations aligned with the supported tooling runtime.** `@types/node` can move within 24.x to `24.19.2`; moving to 26.x would expose APIs independently of the actual runtime. `globals` can be refreshed to `17.13.0` in Commit 1 without upgrading ESLint.
8. **Hold unrelated test-platform migrations.** jsdom 30 raises Node requirements and changes CSS behavior; jest-dom 7 adds a required DOM-query peer. Neither removes code currently used by Bytebook's Bun tests. Plan those only when their capabilities are needed.

## Commit 1: Stabilize the frontend tooling boundary

**Title:** `build(frontend): use stable native TypeScript and compatible analysis tools`

**Rationale:** Keep native checking independent from the JavaScript compiler API used by linting. Remove the redundant direct Bun-type dependency and the floating `latest` type version. Also update Node 24 declarations and environment definitions while preserving the selected runtime baseline.

**Files:** Modify [frontend/package.json](/Users/etesam/Coding/bytebook-w2/frontend/package.json), [frontend/tsconfig.json](/Users/etesam/Coding/bytebook-w2/frontend/tsconfig.json), and [frontend/bun.lock](/Users/etesam/Coding/bytebook-w2/frontend/bun.lock).

```diff
--- a/frontend/package.json
+++ b/frontend/package.json
@@
-    "tsgo": "tsgo",
+    "tsgo": "bun ./node_modules/typescript-native/bin/tsc",
@@
-    "@eslint/js": "^9.39.3",
+    "@eslint/js": "9.39.5",
@@
-    "@types/bun": "^1.3.9",
+    "@types/bun": "1.4.3",
@@
-    "@types/node": "^24.10.13",
+    "@types/node": "24.19.2",
@@
-    "globals": "^16.5.0",
+    "globals": "17.13.0",
@@
-    "@typescript/native-preview": "^7.0.0-dev.20260221.1",
@@
-    "bun-types": "latest",
@@
-    "eslint": "^9.39.3",
+    "eslint": "9.39.5",
@@
-    "eslint-plugin-react-hooks": "^7.0.1",
+    "eslint-plugin-react-hooks": "7.1.1",
@@
-    "knip": "^5.85.0",
+    "knip": "6.41.0",
@@
-    "typescript": "^5.9.3",
-    "typescript-eslint": "^8.56.0",
+    "typescript": "5.9.3",
+    "typescript-eslint": "8.71.2",
+    "typescript-native": "npm:typescript@7.0.2",
--- a/frontend/tsconfig.json
+++ b/frontend/tsconfig.json
@@
-    "types": ["bun-types", "react", "react-dom"],
+    "types": ["bun", "react", "react-dom"],
```

`@types/bun` provides the public declaration entry and depends on the matching Bun declarations. Retain the `tsgo` script name so the check runner and existing commands continue working. The explicit executable path avoids ambiguity between two dependencies exposing a `tsc` binary. If the target compiler reports stricter diagnostics, fix each actual diagnostic here; do not relax `strict` or add blanket exclusions. Existing `paths` and explicit global types already avoid two common TS7 migration problems.

**Verification:**

```bash
(cd frontend && bun install && bun run tsgo && bun run lint:check && bun run knip)
bun check:fe
```

Expected: native typecheck, existing type-aware React lint rules, Knip, all unit tests, and existing browser workflows pass. Knip's removal of class-member analysis requires no config edit: Bytebook does not enable that issue type. Keep Prettier unchanged here to avoid mixing formatting churn with compiler migration.

Sources: [TypeScript 7 and API limitations](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [Knip 6](https://knip.dev/blog/knip-v6), [React lint peer requirements](https://github.com/jsx-eslint/eslint-plugin-react/blob/v7.37.5/package.json).

## Commit 2: Upgrade the Vite React integration without changing compilers

**Title:** `build(frontend): migrate Vite React Compiler configuration`

**Rationale:** Adapt the removed Babel option independently of editor behavior changes. Keep the existing React Compiler while opening a separately verifiable path to the experimental native implementation.

**Files:** Modify [frontend/package.json](/Users/etesam/Coding/bytebook-w2/frontend/package.json), [frontend/vite.config.ts](/Users/etesam/Coding/bytebook-w2/frontend/vite.config.ts), and [frontend/bun.lock](/Users/etesam/Coding/bytebook-w2/frontend/bun.lock).

```diff
--- a/frontend/vite.config.ts
+++ b/frontend/vite.config.ts
@@
-import react from '@vitejs/plugin-react';
-import reactCompiler from 'babel-plugin-react-compiler';
+import react, { reactCompilerPreset } from '@vitejs/plugin-react';
+import babel from '@rolldown/plugin-babel';
@@
-const ReactCompilerConfig = {
-  // Your react-compiler options here
-  target: '19',
-};
@@
-      react({
-        babel: {
-          plugins: [[reactCompiler, ReactCompilerConfig]],
-        },
-      }),
+      react(),
+      babel({ presets: [reactCompilerPreset({ target: '19' })] }),
--- a/frontend/package.json
+++ b/frontend/package.json
@@
-    "@vitejs/plugin-react": "^5.2.0",
+    "@vitejs/plugin-react": "6.1.2",
+    "@rolldown/plugin-babel": "0.2.4",
+    "@babel/core": "^7.29.0",
+    "@types/babel__core": "7.20.5",
@@
-    "vite": "^8.2.2"
+    "vite": "8.3.4"
```

Retain `babel-plugin-react-compiler@1.0.0`, existing module dedupe, chunk grouping, and typed Wails event plugin. Keep Babel on its supported 7.x line for this step. Resolve its exact patch into the lockfile at execution. The plugin-babel runtime-transform peers are optional for this compiler-only usage; confirm its published peer metadata during install.

**Verification:**

```bash
(cd frontend && bun install && bun run build:ci)
bun check:fe
```

Expected: compiler-generated `react/compiler-runtime` usage remains in output; Fast Refresh updates ordinary and compound components; editor typing, sidebar interaction, and note reopen continue working. Check development HMR manually without adding a dedicated E2E spec.

Source: [plugin-react compiler migration](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#react-compiler).

## Commit 3: Upgrade UI and state dependencies with behavior preserved

**Title:** `build(frontend): update React and shared UI dependencies`

**Rationale:** Establish the target runtime before changing editor registration. Keep new product components and animations out of this dependency-only commit.

**Files:** Modify [frontend/package.json](/Users/etesam/Coding/bytebook-w2/frontend/package.json) and [frontend/bun.lock](/Users/etesam/Coding/bytebook-w2/frontend/bun.lock).

```diff
--- a/frontend/package.json
+++ b/frontend/package.json
@@
-    "@floating-ui/react": "^0.27.18",
+    "@floating-ui/react": "0.27.20",
@@
-    "@react-aria/overlays": "^3.32.0",
+    "@react-aria/overlays": "3.32.1",
@@
-    "@tanstack/react-query": "^5.90.21",
+    "@tanstack/react-query": "5.104.4",
@@
-    "jotai": "^2.18.0",
-    "jotai-family": "^1.0.1",
+    "jotai": "3.0.1",
+    "jotai-family": "1.1.0",
@@
-    "motion": "^12.38.0",
-    "react-aria": "^3.48.0",
-    "react-aria-components": "^1.17.0",
+    "motion": "14.3.0",
+    "react-aria": "3.53.1",
+    "react-aria-components": "1.22.1",
@@
-    "react-virtuoso": "^4.18.1",
-    "sonner": "^2.0.7",
-    "wouter": "^3.9.0"
+    "react-virtuoso": "4.18.19",
+    "sonner": "2.0.8",
+    "wouter": "3.13.0"
@@
-    "@types/react": "^19.2.14",
-    "@types/react-dom": "^19.2.3",
+    "@types/react": "19.3.0",
+    "@types/react-dom": "19.3.0",
@@
-    "react": "^19.2.4",
-    "react-dom": "^19.2.4",
+    "react": "19.3.1",
+    "react-dom": "19.3.1",
@@
-    "tailwind-merge": "^3.5.0",
-    "tailwindcss": "^4.2.0",
+    "tailwind-merge": "3.7.0",
+    "tailwindcss": "4.3.3",
```

Keep TanStack Query hooks, the global QueryError toast boundary, existing `atomFamily` imports, current routing parser, and current motion values. `react-virtuoso` updates folder grids/sidebar lists; it does not replace Pierre. `scrollbar-width: thin` is already one readable CSS declaration; replacing it with a utility would not simplify it.

**Verification:**

```bash
(cd frontend && bun install && bun run build:ci)
bun check:fe
```

Expected: reopen/settings/tag/search/move workflows pass, route changes do not carry stale state, toast errors remain visible over dialogs, and motion configuration accepts the existing controls. Manually check disabled-control tooltips, editor link actions, and multi-note partial tags. Preserve current appearances and easing.

Sources: [Jotai 3 migration](https://github.com/pmndrs/jotai/blob/main/docs/guides/migrating-to-v3.mdx), [Motion changes](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md), [React Aria 1.22](https://react-aria.adobe.com/releases/v1-22-0).

## Commit 4: Upgrade CodeMirror as one shared dependency set

**Title:** `build(editor): update the shared CodeMirror dependency set`

**Rationale:** Retain one state/view/language identity across wrappers and language packs. This upgrade also supplies Vim commenting and improved hover/cursor APIs without requiring new local machinery.

**Files:** Modify [frontend/package.json](/Users/etesam/Coding/bytebook-w2/frontend/package.json) and [frontend/bun.lock](/Users/etesam/Coding/bytebook-w2/frontend/bun.lock).

```diff
--- a/frontend/package.json
+++ b/frontend/package.json
@@
-    "@codemirror/autocomplete": "^6.20.0",
+    "@codemirror/autocomplete": "6.20.3",
@@
-    "@codemirror/lang-javascript": "^6.2.4",
+    "@codemirror/lang-javascript": "6.2.5",
@@
-    "@codemirror/language": "6.12.2",
-    "@codemirror/state": "6.5.4",
-    "@codemirror/view": "6.39.15",
+    "@codemirror/language": "6.13.1",
+    "@codemirror/state": "6.7.6",
+    "@codemirror/view": "6.43.14",
@@
-    "@replit/codemirror-vim": "^6.3.0",
+    "@replit/codemirror-vim": "6.4.0",
@@
-    "@uiw/codemirror-theme-vscode": "^4.25.4",
-    "@uiw/react-codemirror": "^4.25.4",
+    "@uiw/codemirror-theme-vscode": "4.25.12",
+    "@uiw/react-codemirror": "4.25.12",
@@
   "overrides": {
-    "@codemirror/language": "6.12.2",
-    "@codemirror/state": "6.5.4",
-    "@codemirror/view": "6.39.15",
+    "@codemirror/language": "6.13.1",
+    "@codemirror/state": "6.7.6",
+    "@codemirror/view": "6.43.14",
```

Keep `loadLanguageExtension`, preloaded language state, Vim lazy loading, `tooltips({ parent: document.body })`, and the code/editor selection boundary. The current inspection hook already uses `hoverTooltip`; adding `activateHover` does not eliminate its kernel RPC correlation. Keep the Backspace focus workaround until the original failing interaction is shown to work without it on the target version.

**Verification:**

```bash
(cd frontend && bun install && bun test src/components/editor/transformers && bun run build:ci)
bun check:fe
```

Expected: mixed-language code pastes mount without duplicate-extension errors; editing and reopening preserves code; Vim `gcc` toggles comments when that language's comment support exists; expanded/collapsed blocks retain selection and scroll. Verify kernel inspection in the desktop runtime, since mocked browser tests do not run Jupyter.

Sources: [CodeMirror view](https://code.haverbeke.berlin/codemirror/view/src/branch/main/CHANGELOG.md), [Vim 6.4](https://github.com/replit/codemirror-vim/blob/master/packages/codemirror-vim/CHANGELOG.md).

## Commit 5: Upgrade Lexical and make geometry reads post commit

**Title:** `fix(editor): update Lexical and measure committed selections`

**Rationale:** Pair the version upgrade with its actual timing requirement. Remove duplicated selection notifications for toolbar and table positioning while keeping editing commands in command handlers.

**Files:** Modify [frontend/package.json](/Users/etesam/Coding/bytebook-w2/frontend/package.json), [frontend/bun.lock](/Users/etesam/Coding/bytebook-w2/frontend/bun.lock), [hooks/toolbar.ts](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/hooks/toolbar.ts), [utils/toolbar.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/utils/toolbar.tsx), and [table-actions-menu.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/plugins/table/table-actions-menu.tsx).

Pin `lexical` and every existing `@lexical/*` direct dependency to `0.52.0` in the same manifest/lock edit. The registration migration follows in Commit 6, so this commit can be verified with the existing composer.

```diff
--- a/frontend/src/components/editor/hooks/toolbar.ts
+++ b/frontend/src/components/editor/hooks/toolbar.ts
@@
-  SELECTION_CHANGE_COMMAND,
@@
-      editor.registerCommand(
-        SELECTION_CHANGE_COMMAND,
-        () => {
+      editor.registerUpdateListener(({ editorState }) => {
+        editorState.read(() => {
           updateToolbar({
             editor,
             setDisabled,
             setCurrentSelectionFormat,
             setCurrentBlockType,
             setNoteSelection,
             setFloatingData,
             noteContainerRef,
           });
-          return false;
-        },
-        COMMAND_PRIORITY_LOW
-      ),
-      // Measure after the selection and DOM have committed, so the hint follows
-      // the current caret rather than the previous line.
-      editor.registerUpdateListener(() => {
+        });
         updatePlaceholderLineData({
           editor,
           noteContainerRef,
           setPlaceholderLineData,
         });
       }),
--- a/frontend/src/components/editor/utils/toolbar.tsx
+++ b/frontend/src/components/editor/utils/toolbar.tsx
@@
-      const nativeSelection = window.getSelection()?.getRangeAt(0);
-      const domRect = nativeSelection?.getBoundingClientRect();
+      const nativeSelection = window.getSelection();
+      const domRect = nativeSelection?.rangeCount
+        ? nativeSelection.getRangeAt(0).getBoundingClientRect()
+        : undefined;
--- a/frontend/src/components/editor/plugins/table/table-actions-menu.tsx
+++ b/frontend/src/components/editor/plugins/table/table-actions-menu.tsx
@@
-      editor.registerCommand(
-        SELECTION_CHANGE_COMMAND,
-        delayedCallback,
-        COMMAND_PRIORITY_CRITICAL
-      ),
```

Remove the table file's command/priority imports only if no other use remains. Keep its existing scroll, resize, pointer-up scheduling and teardown. These are distinct geometry triggers; do not replace them with a document-wide generic observer.

`$openLinkEditor` also measures DOM from a command handler. Keep its synchronous selection/editability eligibility check, then defer the DOM-dependent body to the existing Lexical `$onUpdate` API and re-read latest state inside that callback. Extract the current body into a local helper rather than introducing a global scheduler:

```diff
--- a/frontend/src/components/editor/utils/toolbar.tsx
+++ b/frontend/src/components/editor/utils/toolbar.tsx
@@
+  $onUpdate,
@@
-export function $openLinkEditor({
+function $showLinkEditor({
@@
   return true;
 }
+
+export function $openLinkEditor(
+  args: Parameters<typeof $showLinkEditor>[0]
+): boolean {
+  if (!args.editor.isEditable() || !$isRangeSelection($getSelection())) {
+    return false;
+  }
+  $onUpdate(() => {
+    args.editor.read('latest', () => $showLinkEditor(args));
+  });
+  return true;
+}
```

The helper remains local to the existing toolbar utility module. Review content-changing `SELECTION_CHANGE_COMMAND` handlers across the repo before finalizing; the inspected toolbar and table handlers are the relevant current callers.

**Verification:**

```bash
(cd frontend && bun install && bun test src/components/editor)
bun check:fe
```

Expected: existing Markdown/link/table tests pass. The author-and-reopen editor workflow still formats selected text and links. Manually verify rapid arrow-key movement, empty-line hints, Cmd+K on a newly changed selection, table actions after scrolling, and clicking into embedded CodeMirror. Reuse the authoring workflow for any necessary end-to-end link save/reopen assertion.

Sources: [Lexical 0.52 selection timing](https://github.com/facebook/lexical/releases/tag/v0.52.0), [selection lifecycle](https://lexical.dev/docs/concepts/selection#selection-change-timing).

## Commit 6: Move editor registration into a root extension

**Title:** `refactor(editor): compose core behavior through Lexical extensions`

**Rationale:** Declare behavior and its dependencies once, then render only the pieces that need React layout. The migration keeps note-specific fetching, saving, files, code execution, drag behavior, and custom Markdown transformers intact.

**Files:** Modify [frontend/package.json](/Users/etesam/Coding/bytebook-w2/frontend/package.json), [frontend/bun.lock](/Users/etesam/Coding/bytebook-w2/frontend/bun.lock), [editor-config.ts](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/editor-config.ts), and [editor/index.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/index.tsx).

Add exact direct dependencies `@lexical/extension@0.52.0` and `@lexical/history@0.52.0`. Keep `editorConfig` as the shared node/theme source for the existing transformer tests; derive the new root from it so a test-factory migration does not become a prerequisite.

```diff
--- a/frontend/src/components/editor/editor-config.ts
+++ b/frontend/src/components/editor/editor-config.ts
@@
+import { defineExtension, TabIndentationExtension } from '@lexical/extension';
+import { HistoryExtension } from '@lexical/history';
+import { CheckListExtension, ListExtension } from '@lexical/list';
+import { LinkExtension } from '@lexical/link';
@@
 export const editorConfig: InitialConfigType = {
@@
 };
+
+export const noteEditorExtension = defineExtension({
+  name: '@bytebook/note-editor',
+  namespace: editorConfig.namespace,
+  theme,
+  onError,
+  nodes: () => [...(editorConfig.nodes ?? [])],
+  dependencies: [
+    HistoryExtension,
+    ListExtension,
+    CheckListExtension,
+    LinkExtension,
+    TabIndentationExtension,
+  ],
+});
--- a/frontend/src/components/editor/index.tsx
+++ b/frontend/src/components/editor/index.tsx
@@
-import { LexicalComposer } from '@lexical/react/LexicalComposer';
+import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
@@
-import { editorConfig } from './editor-config';
+import { noteEditorExtension } from './editor-config';
@@
-    <LexicalComposer initialConfig={editorConfig}>
+    <LexicalExtensionComposer extension={noteEditorExtension} contentEditable={null}>
@@
-              <ListPlugin />
-              <LinkPlugin />
-              <CheckListPlugin />
-              <TabIndentationPlugin />
-              <HistoryPlugin />
@@
-    </LexicalComposer>
+    </LexicalExtensionComposer>
```

Remove the five now-unused plugin imports. Keep `RichTextPlugin` and its ContentEditable/ErrorBoundary together in this first extension commit: this avoids accidentally duplicating React decorator rendering or a second contentEditable. It is valid to migrate legacy plugins incrementally. Keep `MarkdownShortcutPlugin`, `TablePlugin`, and `AutoLinkPlugin` until each corresponding configuration and custom behavior has been compared. Preserve existing commented debugging UI.

Later registration-only plugins should become extensions only when this removes a component or duplicated lifecycle. Do not create one file and wrapper for every command.

**Verification:**

```bash
(cd frontend && bun install && bun test src/components/editor/transformers src/components/editor/nodes)
bun check:fe
```

Expected: exactly one editor root, correct custom LinkNode replacement, one history stack per editor, no duplicated command handling, list/checklist/indent commands work, and decorator code/media still render. Existing note-switch history reset remains authoritative.

Source: [Incremental React extension migration](https://lexical.dev/docs/extensions/react).

## Commit 7: Read history availability directly from its owner

**Title:** `refactor(editor): derive undo availability from history signals`

**Rationale:** Remove local copies of state that `HistoryExtension` already exposes. Signals also provide the initial value to subscribers instead of waiting for a future availability command.

**Files:** Modify [toolbar/index.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/toolbar/index.tsx) and [hooks/toolbar.ts](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/hooks/toolbar.ts).

```diff
--- a/frontend/src/components/editor/toolbar/index.tsx
+++ b/frontend/src/components/editor/toolbar/index.tsx
@@
+import { HistoryExtension } from '@lexical/history';
+import { useExtensionSignalValue } from '@lexical/react/useExtensionSignalValue';
@@
-  const [canRedo, setCanRedo] = useState(false);
-  const [canUndo, setCanUndo] = useState(false);
+  const canRedo = useExtensionSignalValue(HistoryExtension, 'canRedo');
+  const canUndo = useExtensionSignalValue(HistoryExtension, 'canUndo');
@@
-    setCanUndo,
-    setCanRedo,
--- a/frontend/src/components/editor/hooks/toolbar.ts
+++ b/frontend/src/components/editor/hooks/toolbar.ts
@@
-  CAN_REDO_COMMAND,
-  CAN_UNDO_COMMAND,
@@
-  setCanUndo,
-  setCanRedo,
@@
-  setCanUndo: Dispatch<SetStateAction<boolean>>;
-  setCanRedo: Dispatch<SetStateAction<boolean>>;
@@
-      editor.registerCommand(
-        CAN_UNDO_COMMAND,
-        (canUndo) => {
-          setCanUndo(canUndo);
-          return true;
-        },
-        COMMAND_PRIORITY_LOW
-      ),
@@
-      editor.registerCommand(
-        CAN_REDO_COMMAND,
-        (canRedo) => {
-          setCanRedo(canRedo);
-          return true;
-        },
-        COMMAND_PRIORITY_LOW
-      ),
@@
-    setCanRedo,
-    setCanUndo,
```

Keep `UNDO_COMMAND`, `REDO_COMMAND`, the code-block delegation overrides, and `CLEAR_HISTORY_COMMAND` on note load. Availability and execution remain separate concerns.

**Verification:**

```bash
bun check:fe
```

Expected: undo/redo buttons reflect edits and undo/redo immediately; loading another note clears availability; undo inside CodeMirror follows its existing boundary. Use the existing authoring workflow and manual code-editor checks, without a dedicated button E2E.

Source: [HistoryExtension output](https://lexical.dev/docs/api/modules/lexical_history).

## Commit 8: Simplify the node-selection subscription

**Title:** `fix(editor): subscribe to node-selection snapshots`

**Rationale:** Fix the stale-true transition while deleting the custom mounted flag, effect setup, repeated setState calls, and full selected-node walk. This uses an existing React primitive; the dependency upgrade is not required to make the fix valuable.

**Files:** Modify [hooks/lexical.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/hooks/lexical.tsx). Create [hooks/lexical.test.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/hooks/lexical.test.tsx).

Replace the hook implementation with:

```diff
--- a/frontend/src/hooks/lexical.tsx
+++ b/frontend/src/hooks/lexical.tsx
@@
-import { useEffect, useState } from 'react';
+import { useSyncExternalStore } from 'react';
@@
 export function useNodeInNodeSelection(editor: LexicalEditor, key: string) {
-  const [isInNodeSelection, setIsInNodeSelection] = useState(false);
-  // Remove the effect, mounted flag, checkNodeSelection, and cleanup body.
-  return isInNodeSelection;
+  return useSyncExternalStore(
+    (notify) => editor.registerUpdateListener(notify),
+    () =>
+      editor.read('latest', () => {
+        const selection = $getSelection();
+        return $getNodeByKey(key) !== null &&
+          $isNodeSelection(selection) && selection.has(key);
+      })
+  );
 }
```

Delete the previous body in full, not just its comments. Preserve the explicit `LexicalEditor` parameter so the two callers do not need a signature migration. Do not substitute the boolean from `useLexicalNodeSelection`: upstream computes `node.isSelected()`, which includes range-selection behavior that must not enable CodeMirror editing here.

The test should render a small probe with React DOM and `act`, using the existing DOM setup and a real Lexical editor. A probe needs only:

```tsx
function SelectionProbe({
  editor,
  nodeKey,
}: {
  editor: LexicalEditor;
  nodeKey: string;
}) {
  const selected = useNodeInNodeSelection(editor, nodeKey);
  return <output>{String(selected)}</output>;
}
```

Test observable transitions: node A selected → node B selected makes A false; A selected → range selection makes A false; removing A makes it false. Clean up roots and DOM. The A-to-B case must fail with the old hook before the fix. No new testing-library dependency is needed.

**Verification:**

```bash
(cd frontend && bun test src/hooks/lexical.test.tsx)
bun check:fe
```

Expected: the regression fails before the implementation and passes afterward; switching code blocks cannot leave the previous block editable solely because of a stale subscription snapshot.

## Commit 9: Reuse the existing editor anchor element

**Title:** `refactor(editor): share the mounted note-container element`

**Rationale:** `NotesEditor` already stores the same element needed by three portal consumers. Pass that value instead of scheduling three effects and microtasks to rediscover it after every render.

**Files:** Modify [editor/index.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/index.tsx), [toolbar/index.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/toolbar/index.tsx), [empty-line-placeholder.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/plugins/empty-line-placeholder.tsx), and [draggable-block.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/plugins/draggable-block.tsx). Delete [hooks/ref-state.ts](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/hooks/ref-state.ts).

```diff
--- a/frontend/src/components/editor/index.tsx
+++ b/frontend/src/components/editor/index.tsx
@@
         <Toolbar
+          noteContainerElement={editorAnchorElem}
@@
               <EmptyLinePlaceholderPlugin
-                noteContainerRef={noteContainerRef}
+                noteContainerElement={editorAnchorElem}
@@
               <DraggableBlockPlugin
+                noteContainerElement={editorAnchorElem}
--- a/frontend/src/components/editor/toolbar/index.tsx
+++ b/frontend/src/components/editor/toolbar/index.tsx
@@
-import { useRefState } from '../hooks/ref-state';
@@
   noteContainerRef,
+  noteContainerElement,
@@
   noteContainerRef: RefObject<HTMLDivElement | null>;
+  noteContainerElement: HTMLElement | null;
@@
-  const noteContainerElement = useRefState(noteContainerRef);
--- a/frontend/src/components/editor/plugins/empty-line-placeholder.tsx
+++ b/frontend/src/components/editor/plugins/empty-line-placeholder.tsx
@@
-import { useRefState } from '../hooks/ref-state';
@@
-  noteContainerRef,
+  noteContainerElement,
@@
-  noteContainerRef: RefObject<HTMLDivElement | null>;
+  noteContainerElement: HTMLElement | null;
@@
-  const noteContainerElement = useRefState(noteContainerRef);
--- a/frontend/src/components/editor/plugins/draggable-block.tsx
+++ b/frontend/src/components/editor/plugins/draggable-block.tsx
@@
-import { useRefState } from '../hooks/ref-state';
@@
   filePath,
+  noteContainerElement,
@@
   filePath: FilePath;
+  noteContainerElement: HTMLElement | null;
@@
-  const noteContainerElement = useRefState(noteContainerRef);
```

Remove the unused `RefObject` import in the placeholder file. Keep the actual ref for imperative geometry and the existing `noteContainerRefAtom` for drag behavior. Delete `ref-state.ts` once `rg 'useRefState' frontend/src` has no remaining uses. Preserve the existing callback ref in NotesEditor; it already updates the ref and element state at mount/unmount.

**Verification:**

```bash
rg 'useRefState' frontend/src
bun check:fe
```

Expected: the search returns no uses; placeholder, floating toolbar, and drag handle portal into the current note container from the same state value. Manually check note switches, maximization, TOC layout changes, and dragging. No new geometry E2E is appropriate.

## Commit 10: Raise the Go baseline and update compatible backend dependencies

**Title:** `build(backend): update the Go baseline and ingestion dependencies`

**Rationale:** Make the toolchain requirement explicit before taking the latest sync/text modules. Keep transport and search-format changes in later commits.

**Files:** Modify [go.mod](/Users/etesam/Coding/bytebook-w2/go.mod) and [go.sum](/Users/etesam/Coding/bytebook-w2/go.sum).

```diff
--- a/go.mod
+++ b/go.mod
@@
-go 1.25.0
+go 1.26.0
@@
- github.com/fsnotify/fsnotify v1.9.0
- github.com/stretchr/testify v1.11.1
+ github.com/fsnotify/fsnotify v1.10.1
+ github.com/stretchr/testify v1.12.1
@@
- github.com/yuin/goldmark v1.7.16
- golang.org/x/sync v0.21.0
- golang.org/x/text v0.39.0
+ github.com/yuin/goldmark v1.8.6
+ golang.org/x/sync v0.24.0
+ golang.org/x/text v0.43.0
```

CI's setup-go action already uses `go-version-file: go.mod`. Preserve the local Wails replace. Do not lift all indirect modules to latest: allow minimal version selection to update what the direct dependency graph requires. Keep the current import-coordinator normalization fix and its tests outside this commit's selected paths.

Goldmark source positions could support a later feature, but current extraction does not need a new visitor abstraction merely because position data exists. Keep the bounded ingest executor and watcher registry.

**Verification:**

```bash
go mod tidy
gotestsum --format=pkgname --format-icons=hivis ./internal/ingest/... ./internal/notes/... ./internal/search/...
bun check:be
```

Expected: watcher/import, Markdown extraction, cancellation, Unicode, and existing Go tests pass; the Go version used locally and in CI is at least 1.26. Manually verify the desktop file watcher survives import and watcher recreation on macOS.

Sources: [fsnotify changes](https://github.com/fsnotify/fsnotify/releases/tag/v1.10.0), [sync range](https://go.googlesource.com/sync/+log/refs/tags/v0.21.0..refs/tags/v0.24.0), [text range](https://go.googlesource.com/text/+log/refs/tags/v0.39.0..refs/tags/v0.43.0).

## Commit 11: Migrate LSP types and use generated default handlers

**Title:** `refactor(lsp): adopt typed protocol responses and generated handlers`

**Rationale:** Take the three LSP modules together because their transport and generated unions change as one unit. Replace handwritten protocol dispatch in tests and no-op notification methods with the library's generated implementations.

**Files:** Modify [go.mod](/Users/etesam/Coding/bytebook-w2/go.mod), [go.sum](/Users/etesam/Coding/bytebook-w2/go.sum), [internal/lsp/client.go](/Users/etesam/Coding/bytebook-w2/internal/lsp/client.go), [internal/lsp/instance.go](/Users/etesam/Coding/bytebook-w2/internal/lsp/instance.go), and [internal/lsp/instance_test.go](/Users/etesam/Coding/bytebook-w2/internal/lsp/instance_test.go).

```diff
--- a/go.mod
+++ b/go.mod
@@
- go.lsp.dev/jsonrpc2 v0.10.0
- go.lsp.dev/protocol v0.12.0
- go.lsp.dev/uri v0.3.0
+ go.lsp.dev/jsonrpc2 v1.0.1
+ go.lsp.dev/protocol v1.0.1
+ go.lsp.dev/uri v1.0.1
--- a/internal/lsp/client.go
+++ b/internal/lsp/client.go
@@
-type noopClient struct{}
+type noopClient struct { protocol.UnimplementedClient }
+
+var _ protocol.Client = (*noopClient)(nil)
@@
-func (c *noopClient) ApplyEdit(ctx context.Context, p *protocol.ApplyWorkspaceEditParams) (bool, error) {
- return false, nil
+func (c *noopClient) ApplyEdit(ctx context.Context, p *protocol.ApplyWorkspaceEditParams) (*protocol.ApplyWorkspaceEditResult, error) {
+ return &protocol.ApplyWorkspaceEditResult{Applied: false}, nil
 }
@@
-func (c *noopClient) Configuration(ctx context.Context, p *protocol.ConfigurationParams) ([]interface{}, error) {
- out := make([]interface{}, len(p.Items))
+func (c *noopClient) Configuration(ctx context.Context, p *protocol.ConfigurationParams) ([]protocol.LSPAny, error) {
+ out := make([]protocol.LSPAny, len(p.Items))
  return out, nil
 }
--- a/internal/lsp/instance.go
+++ b/internal/lsp/instance.go
@@
- "go.uber.org/zap"
@@
- _, conn, srv := protocol.NewClient(ctx, &noopClient{}, stream, zap.NewNop())
+ _, conn, srv := protocol.NewClient(ctx, &noopClient{}, stream)
```

Delete explicit `Progress`, `LogMessage`, `ShowMessage`, `PublishDiagnostics`, and `Telemetry` notification no-ops; inherited notification handlers return nil. Keep the explicit request acknowledgements for `WorkDoneProgressCreate`, `RegisterCapability`, `UnregisterCapability`, `ShowMessageRequest`, and `WorkspaceFolders`: the default request handlers return MethodNotFound, so deleting those would change behavior. Confirm configuration returns JSON nulls for each requested section.

Adapt the new typed wire shapes at the existing `Instance` boundary, keeping the exported Bytebook completion shape unchanged:

```diff
--- a/internal/lsp/instance.go
+++ b/internal/lsp/instance.go
@@
- if list == nil {
-  return nil, nil
- }
- return convertItems(list.Items), nil
+ switch result := list.(type) {
+ case nil:
+  return nil, nil
+ case *protocol.CompletionList:
+  return convertItems(result.Items), nil
+ case protocol.CompletionItemSlice:
+  return convertItems(result), nil
+ default:
+  return nil, fmt.Errorf("unsupported completion result %T", list)
+ }
@@
  for i := range items {
   it := &items[i]
+  detail, _ := it.Detail.Get()
+  insertText, _ := it.InsertText.Get()
+  sortText, _ := it.SortText.Get()
@@
-   Detail: it.Detail,
+   Detail: detail,
@@
-   InsertText: it.InsertText,
-   SortText: it.SortText,
+   InsertText: insertText,
+   SortText: sortText,
```

Also adapt these inspected API changes in this same commit: initialization `ProcessID` and `RootURI` are pointers; capability names are `CompletionClientCapabilities`, `ClientCompletionItemOptions`, and `HoverClientCapabilities`; snippet support is a `*bool`; whole-document edits use `&protocol.TextDocumentContentChangeWholeDocument{Text: ...}`; completion documentation and hover contents use typed string/markup union arms. Make `docToString` accept the typed completion documentation and remove its decoded-map fallback. Give hover its own typed switch handling `*MarkupContent`, `String`, `*MarkedStringWithLanguage`, and `MarkedStringSlice`, preserving all returned text.

Replace the fake server's manual method switch and Replier plumbing with typed overrides on `protocol.UnimplementedServer`. Keep its counters, delay/cancellation behavior, injected errors, and existing assertions. The transport setup becomes:

```diff
--- a/internal/lsp/instance_test.go
+++ b/internal/lsp/instance_test.go
@@
 type fakeServer struct {
+ protocol.UnimplementedServer
@@
- serverJSONRPC := jsonrpc2.NewConn(serverStream)
- serverJSONRPC.Go(srvCtx, fake.handler)
+ _, serverJSONRPC, _ := protocol.NewServer(srvCtx, fake, serverStream)
```

The eight typed overrides are `Initialize`, `Initialized`, `DidOpen`, `DidChange`, `Completion`, `Hover`, `Shutdown`, and `Exit`. For example, Completion retains the current lock/counter/delay/error body and returns `(protocol.CompletionResult, error)` directly; Hover returns `&protocol.Hover{Contents: &protocol.MarkupContent{Kind: protocol.Markdown, Value: contents}}`. Remove obsolete encoding/json and direct fake-dispatch imports. `go mod tidy` can demote zap from direct dependencies if the remaining graph still needs it.

**Verification:**

```bash
go mod tidy
go test -race ./internal/lsp/...
bun check:be
```

Expected: handshake, open-once, concurrent requests, cancellation, reconnect, completion and hover tests pass. Add focused net.Pipe coverage for both completion union variants and ignored diagnostic notifications, which must not close the connection. Smoke-test real Pyright completion and hover in a note. No new Wails RPC model is needed, so keep frontend bindings unchanged unless the exported service contract actually changes.

Sources: [Protocol 1.0](https://github.com/go-language-server/protocol/releases/tag/v1.0.0), [default handlers](https://github.com/go-language-server/protocol/blob/v1.0.1/unimplemented.go), [typed transport](https://github.com/go-language-server/protocol/blob/v1.0.1/protocol.go).

## Commit 12: Upgrade Bleve with explicit index verification

**Title:** `build(search): update Bleve and verify persisted index reopening`

**Rationale:** Isolate the index-format dependency change from ranking or product features. Existing query composition remains smaller and easier to reason about than introducing custom callback scoring for the same behavior.

**Files:** Modify [go.mod](/Users/etesam/Coding/bytebook-w2/go.mod), [go.sum](/Users/etesam/Coding/bytebook-w2/go.sum), and [internal/search/index_mapping_test.go](/Users/etesam/Coding/bytebook-w2/internal/search/index_mapping_test.go).

```diff
--- a/go.mod
+++ b/go.mod
@@
- github.com/blevesearch/bleve/v2 v2.5.5
- github.com/blevesearch/bleve_index_api v1.2.11
+ github.com/blevesearch/bleve/v2 v2.6.1
+ github.com/blevesearch/bleve_index_api v1.4.1
--- a/internal/search/index_mapping_test.go
+++ b/internal/search/index_mapping_test.go
@@
+func TestOpenOrCreateIndexReopensPersistedDocuments(t *testing.T) {
+ projectDir := t.TempDir()
+ index, err := OpenOrCreateIndex(projectDir)
+ require.NoError(t, err)
+ require.NoError(t, index.Index("note.md", map[string]string{"content": "migration sentinel"}))
+ require.NoError(t, index.Close())
+
+ reopened, err := OpenOrCreateIndex(projectDir)
+ require.NoError(t, err)
+ defer reopened.Close()
+ document, err := reopened.Document("note.md")
+ require.NoError(t, err)
+ assert.NotNil(t, document)
+}
```

This unit test establishes target-version persistence/reopen behavior, not old-format compatibility. Before accepting this commit, use a temporary project and the pre-upgrade executable to create a real old-version index with saved searches, then open and query that same temporary project with the upgraded executable. Verify edits, deletion, restart and saved-search behavior. Keep the old fixture/build outside the user's real project data. A target-only test must not be presented as a cross-version test.

Do not automatically delete or rebuild a failing production index. If old-format reopening fails, this commit needs a separately designed recoverable index migration before it is executable. The notes and saved searches remain preserved.

**Verification:**

```bash
go mod tidy
go test ./internal/search/...
bun check:be
```

Expected: query syntax, ranking expectations, path matching, tags, saved searches, and target-version reopen pass; the temporary old-index compatibility check succeeds. No vectors, new metrics, nested documents, or custom scoring are added.

Sources: [Bleve 2.6 format and features](https://github.com/blevesearch/bleve/releases/tag/v2.6.0), [2.6.1](https://github.com/blevesearch/bleve/releases/tag/v2.6.1).

## Commit 13: Refresh browser verification and bundle reporting

**Title:** `build(frontend): update browser verification and bundle reporting`

**Rationale:** Upgrade the test browser and analyzer after runtime migration, so failures from new browser engines and report tooling remain independently attributable. Keep the existing workflow boundaries and browser configuration.

**Files:** Modify [frontend/package.json](/Users/etesam/Coding/bytebook-w2/frontend/package.json) and [frontend/bun.lock](/Users/etesam/Coding/bytebook-w2/frontend/bun.lock).

```diff
--- a/frontend/package.json
+++ b/frontend/package.json
@@
-    "@playwright/test": "^1.58.2",
+    "@playwright/test": "1.64.1",
@@
-    "@size-limit/preset-app": "^12.0.0",
+    "@size-limit/preset-app": "12.1.0",
@@
-    "rollup-plugin-visualizer": "^6.0.8",
-    "size-limit": "^12.0.0",
+    "rollup-plugin-visualizer": "7.1.1",
+    "size-limit": "12.1.0",
```

Visualizer 7.1 fixes standalone Vite 8 typing and adds a Markdown report option. Keep the existing treemap output and presets; a new report format is not a reason to duplicate reports in CI. Size Limit 14's new small-library Rolldown preset does not simplify the app preset Bytebook currently uses, so keep that major for a separate need. The CI browser cache already keys off the lockfile, so no workflow edit is required. Check the Node runtime used for build tooling satisfies Visualizer's minimum 22 requirement.

**Verification:**

```bash
(cd frontend && bun install && bunx playwright install chromium && bun run build:analyze && bun run size)
bun check:fe
```

Expected: all 17 existing workflows pass on the new Chromium, the treemap renders, and existing bundle-size budgets pass without increasing them. Keep `reuseExistingServer`, retry policy, and test parallelism unchanged in this commit. A seeded `--shuffle` run is a useful one-time check for hidden test coupling; making it a default CI policy would be a separate decision. WebMCP, component-testing stories, and per-control screenshot tests are outside this migration.

Sources: [Playwright release notes](https://playwright.dev/docs/release-notes), [Visualizer changelog](https://github.com/btd/rollup-plugin-visualizer/blob/master/CHANGELOG.md), [Size Limit changelog](https://github.com/ai/size-limit/blob/main/CHANGELOG.md).

## Optional simplifications after the main sequence

These are concrete candidates, not prerequisites for dependency compatibility. Apply a candidate only after its stated experiment establishes that it removes code while preserving the existing interaction.

### Native React Compiler

The cleanest potential build simplification replaces the Babel preset pipeline from Commit 2 with:

```diff
--- a/frontend/vite.config.ts
+++ b/frontend/vite.config.ts
@@
-import react, { reactCompilerPreset } from '@vitejs/plugin-react';
-import babel from '@rolldown/plugin-babel';
+import react from '@vitejs/plugin-react';
@@
-      react(),
-      babel({ presets: [reactCompilerPreset({ target: '19' })] }),
+      react({ compiler: { target: '19' } }),
```

Affected files are [frontend/vite.config.ts](/Users/etesam/Coding/bytebook-w2/frontend/vite.config.ts), [frontend/package.json](/Users/etesam/Coding/bytebook-w2/frontend/package.json), and [frontend/bun.lock](/Users/etesam/Coding/bytebook-w2/frontend/bun.lock). Add `oxc-transform-react@0.154.0`; remove the direct Babel/compiler packages added or retained by Commit 2 only after confirming no remaining consumers. The documented compiler option is experimental. Test build output and HMR, then run `bun check:fe`; compare compiler diagnostics and development/build timing against the Babel version using the same checkout and cache conditions. Make this a separate atomic commit only after parity is demonstrated.

### One RAC Popover for editor floating content

`getTargetRect` can replace the virtual-element object and reference-setting effect in [floating-menu.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/plugins/floating-menu.tsx). A shared Popover would use the real note container for lifecycle and override its rectangle for selection positioning:

```tsx
<Popover
  triggerRef={noteContainerRef}
  getTargetRect={(container) => {
    const bounds = container.getBoundingClientRect();
    return new DOMRect(
      floatingData.left + bounds.left,
      floatingData.top + bounds.top - container.scrollTop,
      0,
      0,
    );
  }}
  isNonModal
  isOpen={floatingData.isOpen}
  isKeyboardDismissDisabled={floatingData.type === "link"}
  onOpenChange={(open) => {
    if (!open) closeMenu();
  }}
  placement={floatingData.type === "text-format" ? "top" : "bottom"}
  offset={6}
>
  {/* Existing text-format or link form, selected by floatingData.type. */}
</Popover>
```

This is a feasibility excerpt, not a complete replacement: preserve the existing placement of a new-link editor above a text selection, outside-click/focus behavior, and hover-preview dismissal. The real implementation must remove `floatingStyles`, `setFloating`, and `getFloatingProps` plumbing from [floating-text-format.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/plugins/floating-text-format.tsx) and [floating-link-preview.tsx](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/plugins/floating-link-preview.tsx), with the existing focus-within props spread onto the form. Keep selection restoration and persistent selection highlighting.

Accept the candidate only if manual verification shows that selecting text does not focus the Popover, moving between anchor and actions works, Cmd+K/Enter/Escape preserve the selection contract, scrolling/zoom repositions correctly, and clicking format controls acts on the original text. Run the existing author-and-reopen workflow. Table hover actions still use Floating UI, so this does not remove the package from Bytebook. Source: [Popover target rectangles](https://react-aria.adobe.com/Popover).

### Custom node serialization

[FileNode](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/nodes/file.tsx) could use `$config` schemas to remove its serialized-type/import/export boilerplate. Start with FileNode only and compare generated JSON and Markdown round trips before deleting anything. The target API is experimental and uses the checked form `nodeSchema<FileNode>()({ ... })` with `withField(schema, {field: '__src'})`.

Keep [CodeNode](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/nodes/code.tsx) outside that experiment: it has many runtime fields, deliberate idle-state restoration, execution IDs, and a sidecar persistence contract. Schema-driven serialization does not automatically define the correct lifetime of those fields. Compact JSON would not reduce Markdown files. Source: [Lexical 0.51 schemas](https://github.com/facebook/lexical/releases/tag/v0.51.0).

### Lightweight link registration extension

[LinkClickPlugin](/Users/etesam/Coding/bytebook-w2/frontend/src/components/editor/plugins/link-click.tsx) is a registration-only React effect. After Commit 6 it can expose an extension whose `register(editor)` returns the existing root-listener cleanup, while the root lists that extension instead of rendering `<LinkClickPlugin />`. This removes the React context/effect wrapper, but only a small amount of code. Prefer doing it when consolidating link registration; do not introduce a plugin factory abstraction for this single case.

## Changes to defer

- **PreviewTrigger for Lexical links:** the anchors are created by Lexical, and preview/edit operations carry node keys and saved selections. A React trigger per anchor would need a new ownership layer. Keep the delegated bridge.
- **TokenField for multi-note tags:** the alpha control offers token editing, not Bytebook's partial-note counts or override/rebase logic. It is a candidate for a future single-note tag UX, not a replacement for the current bulk editor.
- **MenuTrigger for Pierre context menus:** Pierre owns the trigger, closing, focus restoration, and shadow DOM. Global row menus also update selection on right-click. A wrapper around React-owned triggers can be evaluated separately; deleting the shared context-menu atom requires migrating all callers, not just the popover.
- **Fragment refs:** refs here need a concrete container for portals, scrolling, or Lexical root attachment. Fragment refs do not remove that requirement.
- **New animation abstraction:** no tree-animation adapter exists in this checkout; current Motion use is UI animation and drag state. `animateLayout` does not replace drag domain state or recycled-row identity. Add View Transitions only for an identified user interaction with measured benefit.
- **Compiled shortcut framework:** the current hotkey helper handles two shortcuts. The target compiled APIs are marked experimental/internal in declarations. A new table, command wrappers, and extension would add machinery at the current size.
- **Bleve custom score/filter framework:** existing declarative queries already cover current semantics. Callback scoring, vectors, and hierarchy search need a product requirement and result-quality evaluation.
- **New generic query/response abstraction:** `queryOptions`, query-key factories, and `getBackendResponseData` already own these contracts. There are no old imperative query call sites to replace.
- **Prettier/jsdom/jest-dom major formatting or testing migrations:** isolate their formatting/test-environment effects from this implementation sequence. A later Prettier update should include only formatter-produced changes in its own commit.

## Wails migration gate

The local fork is a separate checkout. Before planning an executable Wails commit, inventory its commits and changed exported APIs against upstream beta.30 using that checkout's source-control conventions. Current source already includes NSPanel/notch support but the global shortcut implementation still describes layout-aware mapping as future work.

A successful Wails migration must coordinate [go.mod](/Users/etesam/Coding/bytebook-w2/go.mod), [frontend/package.json](/Users/etesam/Coding/bytebook-w2/frontend/package.json), [frontend/bun.lock](/Users/etesam/Coding/bytebook-w2/frontend/bun.lock), and [.github/actions/setup-wails/action.yml](/Users/etesam/Coding/bytebook-w2/.github/actions/setup-wails/action.yml). Preserve fork changes before selecting the CI source/ref; do not point CI at an unmodified upstream tag if it lacks required fork APIs. Regenerate JavaScript Wails bindings and generated event names, then verify typed-event injection, RPC calls, dialogs, clipboard, menus, new windows and settings restore in the actual desktop app. Only then choose matching runtime and CLI versions.

This gate is technical scope across two repositories, not an instruction to request approval for routine implementation steps. Its output must establish the fork delta before a version edit is proposed as complete.

## Verification and acceptance

Each entry owns its narrow checks and aggregate gate. Run the broad frontend suite for frontend changes and backend suite for backend changes; avoid rerunning unrelated layers after a documentation-only edit. Extend existing workflows for completed user tasks, use focused unit tests for selection/serialization/transport decisions, and use manual verification for small visual and native-shell behavior.

Acceptance requires reduced duplicated state/lifecycle code, unchanged Markdown/sidecar contracts, preserved editor/code selection boundaries, passing required checks, and explicit results for the LSP and Bleve compatibility checks. Changes in the optional section remain separate decisions with their own evidence. No performance improvement is claimed without a comparable before/after measurement.
