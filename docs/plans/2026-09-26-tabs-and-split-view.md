# Tabs and editor groups

Status: implemented 2026-09-26 in four commits (`nntnwxqk`, `lqznnnyx`, `zlyzkomo`, and the editor-groups commit), after being revised the same day from Chrome split view to VS Code editor groups. `bun check` passes. The full e2e suite has 124 passing and the same 29 failing tests as before the work (fixture gaps: missing `GetAllPaths`, attachment picker, link editing, markdown, tags). The native checks listed under each commit haven't been run.

## Read this first

### What matters most

- **Commits 1 and 2 change nothing visible, and they're most of the risk.** The editor assumes there's only one of it, and navigation assumes one global URL. Both must change before a second editor can exist. Tabs appear in commit 3 and groups in commit 4.
- **The URL stops being the source of truth.** `workspaceAtom` (a split tree of groups → tabs, each tab with its own back/forward history) owns navigation. The browser URL only mirrors the focused tab: `replaceState`, never `pushState`. That mirror exists for reloads, e2e `toHaveURL`, and windows opened at a URL (Open in New Window).
- **One navigation rule afterward.** Components call wouter's `useLocation()`, which navigates their own tab. Non-React code (tree callbacks, palette actions) calls `navigateToPath` / `navigateFocusedPane`, which targets the focused group's active tab. `wouter/use-browser-location` is lint-banned, and `window.history.back/forward` is removed.
- **Anything "global" inside a note must be per-editor or focused-only.** This includes editor atoms, DOM ids, Wails command events (⌘F, ⌘S), and the palette's current-note commands. Future editor features need the same care: use `useEditorScope()` for per-editor state and `useIsFocusedPane()` for window-level commands.
- **Groups are laid out flat.** `computeLayout` positions every group absolutely from the split tree, so splitting or resizing never re-parents an editor, and editors aren't remounted. Nested flex containers would look simpler, but they remount editors and lose undo history.
- **No new dependencies.** Tabs use React Aria `Tabs` (already installed); keep-alive uses React 19.2 `<Activity>`; groups, resizing, and tab dragging are our own code.

### Potentially contentious

| Change | Why | What you give up |
| --- | --- | --- |
| ⌘W closes the focused tab; closing the window moves to ⇧⌘W | Editor convention once tabs exist | Muscle memory for ⌘W = close window |
| ⌘\ splits right; ⌥-click on a link opens to the side; ⌘-click opens a background tab | VS Code / browser conventions | New shortcuts to learn; ⌥-click no longer does anything else on links |
| `InvisibleTitleBarHeight` removed; window dragging via `--wails-draggable` CSS | Otherwise any mouse-down in the top 35 px drags the window, so tabs can't be dragged | Only empty tab-bar space in top-row groups and the sidebar header drags the window; forgetting `no-drag` on a new header control makes it drag the window |
| File-tree drags never create groups | Dropping a note on an editor keeps inserting a link, with no edge zones competing for the drop | Splits come only from tab drags, "Open to the Side", ⌘\, and the palette |
| Hidden tabs stay mounted (`<Activity>`), with no cap | Undo history, scroll, and cursor survive tab switches | Memory grows with open tabs; hidden tabs pause effects, so they miss kernel output streams |
| Deleting the "interrupt code on leave" cleanup in `editor/hooks/code.ts` | It never ran (it captured a `null` editor). Fixing it would interrupt code on every tab switch | Nothing today; there's still no interrupt-on-close |
| `SavePlugin` owns the save debounce and flushes on unmount/hide | The shared global debounce let one editor cancel another's save | Behavior change: edits made less than 150 ms before navigating are now always saved to the right note |
| `useNoteMarkdown` becomes fetch-only plus an apply effect | The query wrote into whichever editor fetched first, so the same note in two groups wouldn't load | Riskiest data-path change in the plan; commit 1 verification targets it |
| Same note open in two groups is allowed (⌘\ duplicates the tab) | VS Code does the same; echo detection makes it mostly work | Simultaneous typing in both is last-writer-wins, and the non-typing editor's cursor resets when the other saves |
| Moving a tab to another group remounts it | Each group has its own `TabPanels` | That tab reloads from cache and loses scroll and undo (splitting doesn't) |
| Workspace persisted in `localStorage`, last-writer-wins across windows | Simple; matches `mostRecentItems` | With two windows open, the last one to change wins on relaunch; windows opened with ⇧⌘N or Open in New Window start fresh |
| Tab dragging uses pointer events, not HTML5 drag and drop | Lexical and the folder view never see tab drags, and there's no WebKit drag badge | Tabs can't be dragged out to another window or onto the file tree |
| Pane toolbars shrink to a new `--pane-header-height` | A tab bar plus a full-height toolbar would be two tall bars | A visual change to the note and media toolbars; the value needs tuning in the native check |
| The maximize button and traffic-light padding live only in the top-left group's tab bar | That's where the sidebar and traffic lights are | Other groups have no sidebar toggle button (⌘S still works everywhere) |
| The tab's × is `aria-hidden`; keyboard users close with ⌘W or the context menu | `role="tab"` can't contain a button (nested-interactive) | Screen-reader users don't hear a close control on each tab |
| Native file drops route by id prefix in Go (`note-container-*`, `folder-container-*`) | Each editor and folder view needs a unique drop target | A small backend contract; `internal/events/window.go` and the frontend ids must stay in sync |

### Open questions for you

- Keep ⌘W → close tab, or leave ⌘W on the window and pick something else?
- Cap mounted hidden tabs now (for example the last 10 per group), or wait for a real memory problem?
- Is `ctrl+tab` acceptable for next tab if Wails supports it, or would you rather have ⌥⌘→ / ⌥⌘← (VS Code's defaults on macOS)?

## Changes found while executing

- **Commit 1 (done): a pending-save flush can recreate a deleted note.** When a deletion navigates away, the editor unmounts and flushes its pending save, and the backend writes the file again (`external-deletion.spec.ts` caught this). Both deletion paths (`useSyncRouteWithDeletions` and the trash mutation) now set the cached `doesNoteExist` entries to `false` right after navigating, and `SavePlugin` skips the flush for a note marked missing. The predicate moved to `isDeletedNoteQuery` in `utils/routes.ts`. Commit 2's workspace versions of both flows must keep this ordering: redirect, then mark missing, all before React commits the unmount.
- **Commit 2 (done): browser history is gone, so e2e can't use `page.goBack()`.** The URL mirror uses `replaceState`, so the browser has no entries to go back to. `external-deletion.spec.ts` now drives the native Go Back event (`navigation:back`). Window-scoped events need `mockWindowName(context)` (now shared in `tests/e2e/utils/wails-events.ts`) so `isEventInCurrentWindow` passes.
- **Commit 3 (done): showing a hidden tab replaced unsaved-to-disk edits with stale disk content.** `<Activity>` re-runs effects on show, and the markdown query refetches. The refetched data is a new object even when unchanged (the binding returns class instances, which defeat structural sharing), so a reference check doesn't work. `useNoteMarkdown` now skips data whose markdown equals the disk content this editor last saw (`lastSeenMarkdownRef`, reset on path change). `tabs.spec.ts` covers it ("keeps typed text and undo history across tab switches").
- **Commit 3: the maximize button moved, so two e2e specs now find it by name** (`getByRole('button', { name: 'Maximize note' })`) instead of the editor toolbar's DOM structure. The icon export is `Xmark`, not `XMark`.
- **Commit 4 (done): ⌘\\ is `cmdorctrl+\\` in Go.** Wails has no `backslash` key name, but any single printable character parses as itself. `tabDragAtom` and `splitResizePreviewAtom` live in `atoms.ts` (project rule), and `TabDropTarget` in `types.ts`. File-tree-to-editor link insertion is covered by the existing `drag-ghost` and `content-insertion` specs, so `tabs.spec.ts` doesn't repeat it.
- **e2e runs must not reuse a foreign Vite server.** `playwright.config.ts` reuses whatever listens on 5173 locally. Run against this checkout with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174` and `bun run dev:internal -- --port 5174 --strictPort`.

## Changes after rebase

The two new commits change a few details below:

- **`activeNoteCommandsAtom`** (editor palette commands) is global by design: "the current note's commands". It stays in `editor/atoms.ts` (commit 1). Commit 2 makes only the focused pane register it, and cleanup clears it only if it still holds that pane's commands. Otherwise a hidden or unfocused pane unmounting would wipe the focused note's commands.
- **The `note-title` and `note-find-input` DOM ids** are read with `document.getElementById` by the rename and find palette commands. With tabs, several copies exist, hidden ones included, and `getElementById` returns the first. Commit 1 moves both ids into the editor scope.
- **Open in New Window** needs no changes: the new window opens at `/notes/<path>`, which `initializeWorkspace` turns into its first pane. The tree menu now lists "Open in New Window" first. Commit 3 puts "Open in New Tab" directly above it.
- **`use-palette-commands.tsx`** still calls `window.history.back/forward`; commit 2's replacement is unchanged.

## Goal

The note area works like VS Code's editor groups. It is split into any number of groups, side by side or stacked, and each group has its own tab strip. Each tab shows one note, folder, or kernel view. Tabs can be dragged within a strip, into another group's strip, onto another group's content (moves the tab into that group), or onto a group's edge (splits a new group off with that tab). "Open to the Side" in the file tree's context menu, ⌘\, and the command palette create splits. Dragging a note from the file tree into an editor still inserts a link. The sidebar maximize/minimize button moves from the per-view headers into the top-left group's tab bar. No new dependencies.

## Decisions

| Topic | Decision |
| --- | --- |
| Model | VS Code editor groups, not Chrome split view. The layout is a tree of n-ary `row`/`column` splits whose leaves are groups. Each group holds an ordered list of tabs plus an active tab. |
| Tabs and panes | A tab is a pane: `{ id, history, historyIndex }`. Every tab keeps its own back/forward stack and its own wouter router, so a background tab keeps its place. |
| Source of truth | `workspaceAtom`: `{ root, focusedGroupId }`. The focused pane is the active tab of the focused group. The browser URL mirrors it with `replaceState` (for e2e `toHaveURL` and the route debug view) and seeds the first pane on load (for e2e `page.goto(NOTE_URL)` and new windows at `/`). `?restore` loads the saved workspace. |
| Routing | Each pane renders inside its own wouter `<Router hook>`, and the app shell sits in a Router bound to the focused pane. Existing `useRoute` / `useLocation` / `useFilePathFromRoute` callers stay as they are and become pane-scoped. `wouter/use-browser-location` and `window.history` go away, enforced by a lint rule. The file tree, Quick Open, and sidebar links all navigate the focused pane. |
| Editor instance safety | The editor assumes a single instance: module-level atoms (`previousMarkdownAtom`, `editorAtom`, `noteContainerRefAtom`, …), one shared save debounce, the `id="note-container"` / `id="content-editable-editor"` ids, and a query whose `queryFn` writes into whichever editor fetched first. Commit 1 scopes all of this to each instance before a second editor can mount. |
| Hidden tabs | Each group uses React Aria `TabPanel shouldForceMount` with React 19.2 `<Activity>`, so Lexical state, undo history, and scroll position survive tab switches. Effects are torn down while a tab is hidden: pending saves flush on hide, and content re-syncs from disk on show. |
| Window dragging | Wails' `InvisibleTitleBarHeight: 35` turns every mouse-down in the top 35 px into a native window drag, which would make tabs undraggable. It is replaced by `--wails-draggable: drag` on the empty tab-bar space of groups in the top row and on the sidebar header. |
| Drag and drop | Tabs use pointer events, not HTML5 drag and drop. That way Lexical's drop handlers never see them and WebKit's drag badge never shows. File-tree drags are unchanged: dropping on an editor inserts a link. Splits come from "Open to the Side", ⌘\, the palette, and dragging tabs. |
| Drop zones | While a tab is being dragged, each group's content shows VS Code's five zones: the four outer 30% strips split a new group off that edge, and the center moves the tab into the group. Tab strips take an insertion index. |
| Resizing | A split handle generalized from `PanelResizeHandle`: `useMove`, keyboard steps, a minimum size, direct DOM writes while dragging, and a commit on drag end. Double-click resets the split to equal sizes. |
| Same note twice | Allowed. ⌘\ duplicates the active tab into a new group. Each editor keeps its own `previousMarkdown`, and a save from one editor arrives in the other as a `FILE_WRITE` and is applied there. |
| Keyboard | ⌘T opens a new empty tab in the focused group, right after its active tab, and selects it. It's a native menu accelerator (File → New Tab, `tab:new`), so it works while an editor has focus, and nothing else in the app uses ⌘T today. ⌘W closes a tab, ⌃⇥ / ⌃⇧⇥ switch tabs, and ⌘\ splits right (commit 4). |
| Close | ⌘W closes the focused group's active tab. A group closes when its last tab closes, unless it is the only group, which keeps one empty tab. The window's own Close moves to ⇧⌘W. |

## Known v1 limitations

- Moving a tab to another group remounts it: the editor reloads from cache and scroll position resets.
- Hidden tabs don't receive kernel output streams, because their event listeners are torn down with the effects.
- Workspace persistence is last-writer-wins across windows.
- Quick Open always opens in the focused group. There's no ⌘Enter "open to the side" yet, because React Aria's `onAction` doesn't expose the key event.
- There's no cap on how many hidden tabs stay mounted.

## Commits

| # | Commit | Visible change |
| --- | --- | --- |
| 1 | `refactor(editor): scope editor state to each editor instance` | None |
| 2 | `refactor(routing): route every view through a workspace pane` | None (one group, one tab) |
| 3 | `feat(tabs): add tab bar with keep-alive tabs` | Tabs; maximize button in the tab bar |
| 4 | `feat(tabs): add editor groups with split, move, and resize` | Groups |

Each commit ends with `bun check` from the repo root. After it passes, `jj commit -m "<title>"`.

The Wails fork's `WailsWKWebView` fix for the red "0" drag badge stays in place. File-tree drags onto editors still go through WebKit's drop path.

---

### Commit 1: `refactor(editor): scope editor state to each editor instance`

**Rationale**: Every later commit mounts more than one `NotesEditor`. Today two editors would share a save debounce (typing in one pane cancels the other's save), share `previousMarkdown` (echo detection breaks), and collide on DOM ids that native file drops route by. Fixing this first keeps the routing and tab commits focused on routing and tabs.

**Files**:

- Create: [`frontend/src/components/editor/editor-scope.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/editor-scope.tsx)
- Modify: [`frontend/src/components/editor/atoms.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/atoms.ts)
- Modify: [`frontend/src/components/editor/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/index.tsx)
- Modify: [`frontend/src/components/editor/plugins/save.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/plugins/save.tsx)
- Modify: [`frontend/src/components/editor/hooks/toolbar.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/hooks/toolbar.ts)
- Modify: [`frontend/src/hooks/notes.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/hooks/notes.tsx) (`useNoteWriteEvent`)
- Modify: [`frontend/src/components/editor/toolbar/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/toolbar/index.tsx), [`note-title.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/note-title.tsx), [`hooks/intersection-observer.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/hooks/intersection-observer.ts), [`hooks/draggable-block.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/hooks/draggable-block.ts), [`plugins/draggable-block.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/plugins/draggable-block.tsx), [`hooks/observers.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/hooks/observers.tsx), [`file/media/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/file/media/index.tsx)
- Delete: [`frontend/src/components/editor/hooks/code.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/hooks/code.ts)
- Modify: [`frontend/src/components/editor/utils/note-commands.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/utils/note-commands.ts), [`utils/drag/caret.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/utils/drag/caret.ts), [`utils/drag/constants.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/utils/drag/constants.ts), [`frontend/src/utils/draggable.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/draggable.ts)
- Modify: [`frontend/src/components/folder-renderer/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/folder-renderer/index.tsx), [`hooks/use-folder-renderer-drop.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/folder-renderer/hooks/use-folder-renderer-drop.ts), [`hooks/use-folder-renderer-drop.test.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/folder-renderer/hooks/use-folder-renderer-drop.test.tsx)
- Modify: [`internal/events/window.go`](file:///Users/etesam/Coding/bytebook/internal/events/window.go)
- Modify e2e selectors: [`frontend/tests/e2e/utils/editor.ts`](file:///Users/etesam/Coding/bytebook/frontend/tests/e2e/utils/editor.ts), [`specs/editor/editor.spec.ts`](file:///Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/editor/editor.spec.ts), [`specs/editor/drag-ghost.spec.ts`](file:///Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/editor/drag-ghost.spec.ts), [`specs/folder-sidebar.spec.ts`](file:///Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/folder-sidebar.spec.ts)

**Diffs**:

```diff
--- /dev/null
+++ b/frontend/src/components/editor/editor-scope.tsx
@@ -0,0 +1,47 @@
+import { atom } from 'jotai';
+import type { BaseSelection } from 'lexical';
+import {
+  createContext,
+  createRef,
+  use,
+  useState,
+  type ReactNode,
+} from 'react';
+
+// Per-instance editor state; module-level atoms would be shared by every open pane.
+function createEditorScope() {
+  return {
+    // The prefix is matched by internal/events/window.go to route native file drops.
+    containerId: `note-container-${crypto.randomUUID()}`,
+    // Looked up by palette commands; several editors can be mounted at once.
+    titleInputId: `note-title-${crypto.randomUUID()}`,
+    findInputId: `note-find-input-${crypto.randomUUID()}`,
+    noteContainerRef: createRef<HTMLDivElement>(),
+    noteSelectionAtom: atom<BaseSelection | null>(null),
+    isToolbarDisabledAtom: atom(false),
+    noteIntersectionObserverAtom: atom<IntersectionObserver | null>(null),
+    noteSeenFileNodeKeysAtom: atom<Set<string>>(new Set<string>()),
+    previousMarkdownAtom: atom(''),
+    draggableBlockElementAtom: atom<HTMLElement | null>(null),
+  };
+}
+
+export type EditorScope = ReturnType<typeof createEditorScope>;
+
+const EditorScopeContext = createContext<EditorScope | null>(null);
+
+export function EditorScopeProvider({ children }: { children: ReactNode }) {
+  const [scope] = useState(createEditorScope);
+  return <EditorScopeContext value={scope}>{children}</EditorScopeContext>;
+}
+
+export function useEditorScope(): EditorScope {
+  const scope = use(EditorScopeContext);
+  if (!scope) {
+    throw new Error('useEditorScope must be used inside EditorScopeProvider');
+  }
+  return scope;
+}
```

```diff
--- a/frontend/src/components/editor/atoms.ts
+++ b/frontend/src/components/editor/atoms.ts
@@
 import { atom } from 'jotai';
 import type { NotePaletteCommand } from '@/types';
-import type { RefObject } from 'react';
-import { BaseSelection, LexicalEditor } from 'lexical';

 // Drag and drop atoms
 export { draggedGhostElementAtom } from '@/atoms';
-export const draggableBlockElementAtom = atom<HTMLElement | null>(null);
-
-// Editor toolbar state atom
-export const isToolbarDisabledAtom = atom<boolean>(false);
-
-// Editor core atoms
-export const editorAtom = atom<LexicalEditor | null>(null);
-export const noteSelectionAtom = atom<BaseSelection | null>(null);
-
-// Note container and observer atoms
-export const noteContainerRefAtom = atom<RefObject<HTMLElement | null> | null>(
-  null
-);
-export const noteIntersectionObserverAtom = atom<IntersectionObserver | null>(
-  null
-);
-
-// Note file tracking atoms
-export const noteSeenFileNodeKeysAtom = atom<Set<string>>(new Set([]));
-
-// Previous markdown tracking atom
-export const previousMarkdownAtom = atom<string>('');

 // Commands belong to the loaded note and are removed when its toolbar unmounts.
 export const activeNoteCommandsAtom = atom<{
```

(`activeNoteCommandsAtom` stays global: it describes the focused note. Commit 2 gates who writes it.)

The two DOM ids read by palette commands move into the scope:

```diff
--- a/frontend/src/components/editor/note-title.tsx
+++ b/frontend/src/components/editor/note-title.tsx
@@
-  const setIsToolbarDisabled = useSetAtom(isToolbarDisabledAtom);
+  const { isToolbarDisabledAtom, titleInputId } = useEditorScope();
+  const setIsToolbarDisabled = useSetAtom(isToolbarDisabledAtom);
@@
-        id="note-title"
+        id={titleInputId}
```

```diff
--- a/frontend/src/components/editor/toolbar/note-find-panel/index.tsx
+++ b/frontend/src/components/editor/toolbar/note-find-panel/index.tsx
@@
-            id="note-find-input"
+            id={findInputId}
```

(`NoteFindPanel` reads `const { findInputId } = useEditorScope();`.)

```diff
--- a/frontend/src/components/editor/toolbar/index.tsx
+++ b/frontend/src/components/editor/toolbar/index.tsx
@@
     openFind: () => {
       setIsSearchOpen(true);
-      document.getElementById('note-find-input')?.focus();
+      document.getElementById(findInputId)?.focus();
     },
```

```diff
--- a/frontend/src/components/editor/hooks/palette-commands.ts
+++ b/frontend/src/components/editor/hooks/palette-commands.ts
@@ export function useNotePaletteCommands({
   const setCommands = useSetAtom(activeNoteCommandsAtom);
+  const { titleInputId } = useEditorScope();
@@
           case 'rename-note': {
-            const input = document.getElementById('note-title');
+            const input = document.getElementById(titleInputId);
```

`NotesEditor` becomes a provider shell so hooks in the body can read the scope and the composer:

```diff
--- a/frontend/src/components/editor/index.tsx
+++ b/frontend/src/components/editor/index.tsx
@@
-import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
 import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
 import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
 import { ListPlugin } from '@lexical/react/LexicalListPlugin';
-import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
 import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
@@
-import { useQueryClient } from '@tanstack/react-query';
 import { useAtom, useAtomValue, useSetAtom } from 'jotai';
-import { useRef, useState, type SetStateAction } from 'react';
-import {
-  draggableBlockElementAtom,
-  draggedGhostElementAtom,
-  editorAtom,
-} from './atoms';
+import { useRef, useState, type SetStateAction } from 'react';
+import { draggedGhostElementAtom } from './atoms';
+import { EditorScopeProvider, useEditorScope } from './editor-scope';
@@
-import { debouncedNoteHandleChange } from './utils/note-commands.ts';
 import { useAutoScrollDuringDrag } from '@hooks/draggable';
-import { useCodeCleanup } from './hooks/code';
 import { useLspNoteLifecycle } from '@hooks/lsp';
@@
-export function NotesEditor({
+export function NotesEditor(props: {
+  filePath: FilePath;
+  animationControls: LegacyAnimationControls;
+}) {
+  return (
+    <EditorScopeProvider>
+      <LexicalComposer initialConfig={editorConfig}>
+        <NotesEditorContent {...props} />
+      </LexicalComposer>
+    </EditorScopeProvider>
+  );
+}
+
+function NotesEditorContent({
   filePath,
   animationControls,
 }: {
   filePath: FilePath;
   animationControls: LegacyAnimationControls;
 }) {
   const projectSettings = useAtomValue(projectSettingsAtom);
-  const queryClient = useQueryClient();
-  const setEditor = useSetAtom(editorAtom);
-
-  const noteContainerRef = useRef<HTMLDivElement | null>(null);
+  const { containerId, noteContainerRef, draggableBlockElementAtom } =
+    useEditorScope();
@@
-  // Use custom hooks for code cleanup and intersection observer
-  useCodeCleanup(noteContainerRef);
   useNoteIntersectionObserver(folder, note, noteContainerRef);
   useLspNoteLifecycle();

   return (
-    <LexicalComposer initialConfig={editorConfig}>
-      <div className="flex h-full min-h-0 flex-col">
+    <div className="flex h-full min-h-0 flex-col">
@@
-              id="note-container"
+              id={containerId}
+              data-note-container
               data-file-drop-target
@@
-                      id="content-editable-editor"
+                      data-note-editable
                       className="editor-content min-h-full"
@@
-              <OnChangePlugin
-                ignoreSelectionChange
-                onChange={(_, editor, tag) =>
-                  debouncedNoteHandleChange(editor, tag, queryClient)
-                }
-              />
@@
               <SavePlugin filePath={filePath} setFrontmatter={setFrontmatter} />
-              <EditorRefPlugin
-                editorRef={(editorRefValue) => {
-                  setEditor(editorRefValue);
-                }}
-              />
               <FilesPlugin />
@@
-      </div>
-    </LexicalComposer>
+    </div>
   );
 }
```

(Re-indent the returned JSX one level now that `LexicalComposer` moved to the shell.)

`hooks/code.ts` is deleted. Its interrupt branch never ran: the cleanup closed over the first render's `editor`, which is always `null`. Removing it keeps today's behavior. Fixing it would make every tab switch interrupt running code, because `<Activity>` runs effect cleanups. Its only live job, publishing the container ref, is replaced by the ref held in the scope.

`SavePlugin` owns the debounce. The global `debouncedNoteHandleChange` let an edit in one pane cancel another pane's pending save, and nothing flushed it on unmount. Once tabs exist, the cleanup runs on hide:

```diff
--- a/frontend/src/components/editor/plugins/save.tsx
+++ b/frontend/src/components/editor/plugins/save.tsx
@@
 import {
   COMMAND_PRIORITY_EDITOR,
   COMMAND_PRIORITY_LOW,
+  HISTORY_MERGE_TAG,
   type LexicalCommand,
@@
-import { previousMarkdownAtom } from '../atoms';
+import { useEditorScope } from '../editor-scope';
@@
+const SAVE_DEBOUNCE_MS = 150;
+
 export function SavePlugin({
@@
   const store = useStore();
   const [editor] = useLexicalComposerContext();
   const queryClient = useQueryClient();
+  const { previousMarkdownAtom } = useEditorScope();
@@
-  // Register a command to save markdown content
-  // This effect runs once when the component mounts and sets up the command
-  // The command converts the editor content to markdown, updates frontmatter,
-  // updates state, and saves the note to the backend
+  // Must run inside an editor read or update.
+  function $saveNote(payload: SaveMarkdownContentPayload) {
+    const markdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS, undefined, true);
+    // …existing body of the SAVE_MARKDOWN_CONTENT handler, unchanged, minus `return true`…
+  }
+
   useEffect(() => {
-    return mergeRegister(
+    let pendingSave: ReturnType<typeof setTimeout> | null = null;
+    const flushPendingSave = () => {
+      if (pendingSave === null) return;
+      clearTimeout(pendingSave);
+      pendingSave = null;
+      editor.read(() => $saveNote(undefined));
+    };
+
+    const unregister = mergeRegister(
+      editor.registerUpdateListener(
+        ({ dirtyElements, dirtyLeaves, prevEditorState, tags }) => {
+          if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
+          if (prevEditorState.isEmpty() || tags.has(HISTORY_MERGE_TAG)) return;
+          if (
+            tags.has('note:write-from-external') ||
+            tags.has('note:initial-load')
+          ) {
+            return;
+          }
+          if (pendingSave !== null) clearTimeout(pendingSave);
+          pendingSave = setTimeout(flushPendingSave, SAVE_DEBOUNCE_MS);
+        }
+      ),
       editor.registerCommand<SaveMarkdownContentPayload>(
         SAVE_MARKDOWN_CONTENT,
         (payload) => {
-          const markdown = $convertToMarkdownString(
-          …
-          store.set(previousMarkdownAtom, markdownWithFrontmatter);
-
+          $saveNote(payload);
           return true;
         },
         COMMAND_PRIORITY_EDITOR
       ),
       // …UNDO_COMMAND / REDO_COMMAND registrations unchanged…
     );
-  }, [editor, filePath, setFrontmatter, queryClient, store]);
+    return () => {
+      // Hidden tabs and navigation run this; keep edits still inside the debounce window.
+      flushPendingSave();
+      unregister();
+    };
+  }, [editor, filePath, setFrontmatter, queryClient, store, previousMarkdownAtom]);
```

```diff
--- a/frontend/src/components/editor/utils/note-commands.ts
+++ b/frontend/src/components/editor/utils/note-commands.ts
@@
   $createRangeSelectionFromDom,
   $createTextNode,
+  $getEditor,
   $getNodeByKey,
@@
-import { debounce } from '@utils/general';
@@
-export const debouncedNoteHandleChange = debounce(noteHandleChange, 150);
@@ export function setSelectionFromPointerInNoteEditor(
-  const caret = caretPositionFromPointInEditor(clientX, clientY);
+  const caret = caretPositionFromPointInEditor({
+    root: editor.getRootElement(),
+    clientX,
+    clientY,
+  });
@@
-/**
- * Handles changes to the note editor.
- * …
- */
-function noteHandleChange(editor: LexicalEditor, tags: Set<string>) {
-  …
-}
@@ export function overrideUpDownKeyCommand(
-      document.getElementById('content-editable-editor')?.focus();
+      $getEditor().getRootElement()?.focus();
@@
-        document.getElementById('content-editable-editor')?.focus();
+        $getEditor().getRootElement()?.focus();
```

(`SAVE_MARKDOWN_CONTENT` and the `'../plugins/save'` import stay only if other functions in the file still use them; Knip will flag leftovers.)

```diff
--- a/frontend/src/components/editor/utils/drag/caret.ts
+++ b/frontend/src/components/editor/utils/drag/caret.ts
@@
-import { CONTENT_EDITABLE_ID, MIN_DROP_CARET_HEIGHT } from './constants';
+import { MIN_DROP_CARET_HEIGHT } from './constants';
@@
-export function caretPositionFromPointInEditor(
-  clientX: number,
-  clientY: number
-): { node: Node; offset: number } | null {
-  const editorEl = document.getElementById(CONTENT_EDITABLE_ID);
+export function caretPositionFromPointInEditor({
+  root,
+  clientX,
+  clientY,
+}: {
+  root: HTMLElement | null;
+  clientX: number;
+  clientY: number;
+}): { node: Node; offset: number } | null {
+  const editorEl = root;
@@ export function getFileTreeDropCaretLayoutInNoteContainer(
-  const caret = caretPositionFromPointInEditor(clientX, clientY);
+  const caret = caretPositionFromPointInEditor({
+    root: noteContainer.querySelector<HTMLElement>('[data-lexical-editor]'),
+    clientX,
+    clientY,
+  });
```

```diff
--- a/frontend/src/components/editor/utils/drag/constants.ts
+++ b/frontend/src/components/editor/utils/drag/constants.ts
@@
-export const CONTENT_EDITABLE_ID = 'content-editable-editor';
```

```diff
--- a/frontend/src/utils/draggable.ts
+++ b/frontend/src/utils/draggable.ts
@@
   if (useNoteContainer) {
-    const noteContainer = document.getElementById('note-container');
+    const noteContainer = element.closest<HTMLElement>('[data-note-container]');
     if (noteContainer) {
```

`useNoteMarkdown` becomes a pure fetch plus an apply effect. Today the `queryFn` writes into the editor that triggered the fetch. Two panes showing the same note share one cache entry, so the second editor would never load. A hidden tab's refetch on show would also clear its undo history and scroll it to the top.

```diff
--- a/frontend/src/components/editor/hooks/toolbar.ts
+++ b/frontend/src/components/editor/hooks/toolbar.ts
@@
-import { draggedGhostElementAtom, previousMarkdownAtom } from '../atoms';
+import { draggedGhostElementAtom } from '../atoms';
+import { useEditorScope } from '../editor-scope';
@@ export function useNoteMarkdown({
-  const setPreviousMarkdown = useSetAtom(previousMarkdownAtom);
+  const store = useStore();
+  const { previousMarkdownAtom } = useEditorScope();
+  const path = `${folder}/${note}.md`;
+  // The path this editor last loaded; data for any other path is an initial load.
+  const loadedPathRef = useRef<string | null>(null);

   const getNoteMarkdownQuery = useQuery({
-    queryKey: queryKeys.noteMarkdown(`${folder}/${note}.md`),
+    queryKey: queryKeys.noteMarkdown(path),
+    // Pure fetch: one cache entry can back several editors showing the same note.
     queryFn: async () => {
-      // Reset previous markdown when loading a new note
-      setPreviousMarkdown('');
       const filePath = createFilePath(
@@
-      editor.setEditable(true);
-      // You don't want a different note to access the same history when you switch notes
-      editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
-      const markdownWithFrontmatter = res.data?.markdown ?? '';
-      setPreviousMarkdown(markdownWithFrontmatter);
-
-      editor.update(
-        …
-      );
-
-      return markdownWithFrontmatter;
+      return {
+        markdown: res.data?.markdown ?? '',
+        codeResults: res.data?.codeResults,
+      };
     },
   });
+
+  const data = getNoteMarkdownQuery.data;
+  useEffect(() => {
+    if (!data) return;
+    const isInitialLoad = loadedPathRef.current !== path;
+    // A tab shown again refetches; only apply disk changes it missed while hidden.
+    if (!isInitialLoad && data.markdown === store.get(previousMarkdownAtom)) {
+      return;
+    }
+    loadedPathRef.current = path;
+    store.set(previousMarkdownAtom, data.markdown);
+    if (isInitialLoad) {
+      editor.setEditable(true);
+      // You don't want a different note to access the same history when you switch notes
+      editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
+    }
+    editor.update(
+      () => {
+        // …existing body: clear formats, parse front matter, setFrontmatter,
+        // $convertFromMarkdownString, applyCodeResultsSidecar(data.codeResults)…
+        if (isInitialLoad) overflowContainerRef.current?.scrollTo(0, 0);
+      },
+      {
+        tag: isInitialLoad
+          ? ['note:initial-load', SKIP_DOM_SELECTION_TAG]
+          : 'note:write-from-external',
+      }
+    );
+  }, [data, path]);
+
   return { getNoteMarkdownQuery };
 }
```

```diff
--- a/frontend/src/hooks/notes.tsx
+++ b/frontend/src/hooks/notes.tsx
@@
-import { previousMarkdownAtom } from '@components/editor/atoms';
+import { useEditorScope } from '@components/editor/editor-scope';
@@ export function useNoteWriteEvent({
   const store = useStore();
+  const { previousMarkdownAtom } = useEditorScope();
```

The remaining consumers switch imports the same way:

```diff
--- a/frontend/src/components/editor/toolbar/index.tsx
+++ b/frontend/src/components/editor/toolbar/index.tsx
@@
-import { isToolbarDisabledAtom, noteSelectionAtom } from '../atoms';
+import { useEditorScope } from '../editor-scope';
@@
   const [editor] = useLexicalComposerContext();
+  const { isToolbarDisabledAtom, noteSelectionAtom } = useEditorScope();
   const [disabled, setDisabled] = useAtom(isToolbarDisabledAtom);
```

```diff
--- a/frontend/src/components/editor/hooks/draggable-block.ts
+++ b/frontend/src/components/editor/hooks/draggable-block.ts
@@
-import { draggableBlockElementAtom, draggedGhostElementAtom } from '../atoms';
+import { draggedGhostElementAtom } from '../atoms';
+import { useEditorScope } from '../editor-scope';
@@ export function useDraggableBlock(
+  const { draggableBlockElementAtom } = useEditorScope();
   const [draggableBlockElement, setDraggableBlockElement] = useAtom(
@@ function useInsertFilesOnEditorDrop({
+  const { containerId } = useEditorScope();
   const { mutateAsync: addDroppedFilesToFolder } =
     useAddDroppedFilesToFolderMutation();

   function onEditorContentDrop(event: WailsEvent<typeof EDITOR_CONTENT_DROP>) {
+    // Every open editor hears the event; only the one under the drop inserts.
+    if (event.data.targetElementId !== containerId) return;
@@ (the node-drag hook that calls setDraggableBlockElement)
+  const { draggableBlockElementAtom } = useEditorScope();
   const setDraggableBlockElement = useSetAtom(draggableBlockElementAtom);
```

```diff
--- a/frontend/src/components/editor/plugins/draggable-block.tsx
+++ b/frontend/src/components/editor/plugins/draggable-block.tsx
@@
-import { draggedGhostElementAtom, noteContainerRefAtom } from '../atoms';
+import { draggedGhostElementAtom } from '../atoms';
+import { useEditorScope } from '../editor-scope';
@@
-  const noteContainerRef = useAtomValue(noteContainerRefAtom);
+  const { noteContainerRef } = useEditorScope();
```

- `note-title.tsx`: `const { isToolbarDisabledAtom } = useEditorScope();`
- `hooks/intersection-observer.ts`: `const { noteIntersectionObserverAtom, noteSeenFileNodeKeysAtom } = useEditorScope();`
- `hooks/observers.tsx`: `const { noteIntersectionObserverAtom } = useEditorScope();`
- `file/media/index.tsx`: `const { noteSeenFileNodeKeysAtom, noteContainerRef } = useEditorScope();` It replaces `useAtomValue(noteContainerRefAtom)`; downstream uses already handle a ref object.

Folder view drops get the same per-instance id:

```diff
--- a/frontend/src/components/folder-renderer/index.tsx
+++ b/frontend/src/components/folder-renderer/index.tsx
@@
-import { useRef } from 'react';
+import { useId, useRef } from 'react';
@@ export function FolderRenderer({
+  // The prefix is matched by internal/events/window.go.
+  const containerId = `folder-container-${useId()}`;
   const { isDropActive, dragProps } = useFolderRendererDrop({
     folderPath,
     containerRef,
+    containerId,
   });
@@
-        id="folder-container"
+        id={containerId}
```

```diff
--- a/frontend/src/components/folder-renderer/hooks/use-folder-renderer-drop.ts
+++ b/frontend/src/components/folder-renderer/hooks/use-folder-renderer-drop.ts
@@ export function useFolderRendererDrop({
   folderPath,
   containerRef,
+  containerId,
 }: {
   folderPath: FolderPath;
   containerRef: RefObject<HTMLElement | null>;
+  containerId: string;
 }) {
@@
   useWailsEvent(FOLDER_CONTENT_DROP, (event) => {
     isNativeDragActive.current = false;
     setIsDropActive(false);
+    if (event.data.targetElementId !== containerId) return;
```

(Update `use-folder-renderer-drop.test.tsx` to pass `containerId: 'folder-container-test'`, render that id, and emit it as `targetElementId`.)

```diff
--- a/internal/events/window.go
+++ b/internal/events/window.go
@@
 import (
+	"strings"
+
 	"github.com/etesam913/bytebook/internal/util"
@@
 		eventName := util.EventFileTreeContentDrop
-		if dropPayload.TargetElementID == "note-container" {
+		// Each pane's editor and folder view carries a unique id with these prefixes.
+		if strings.HasPrefix(dropPayload.TargetElementID, "note-container") {
 			eventName = util.EventEditorContentDrop
-		} else if dropPayload.TargetElementID == "folder-container" {
+		} else if strings.HasPrefix(dropPayload.TargetElementID, "folder-container") {
 			eventName = util.EventFolderContentDrop
 		}
```

The e2e selectors change from `#content-editable-editor` to `[data-note-editable]` and from `#note-container` to `[data-note-container]`, in the four files listed above.

**Verification**:

```bash
bun check
cd frontend && bun run test:unit
cd frontend && bun run test:e2e editor drag-ghost folder-sidebar
```

Native (`wails3 dev --port 5173`):

1. Type, then navigate to another note within 150 ms. The first note's edit is saved (reopen it).
2. ⌘⇧P → "Rename Note" focuses the title, and "Find in Note" opens and focuses the find input.
2. Drop an image from Finder into a note: it inserts at the drop point, once.
3. Drop a file onto a folder view: it's added once.
4. Edit the open note externally (`echo >> file`): the editor updates without its scroll jumping.

---


### Commit 2: `refactor(routing): route every view through a workspace pane`

**Rationale**: This introduces the workspace model with exactly one group holding one tab, so behavior is unchanged and every route consumer is migrated before any tab UI exists. Browser history is no longer used for navigation. Each pane owns its back/forward stack.

**Files**:

- Create: [`frontend/src/utils/workspace.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/workspace.ts), [`frontend/src/utils/workspace.test.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/workspace.test.ts)
- Create: [`frontend/src/hooks/workspace.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/hooks/workspace.tsx), [`frontend/src/hooks/workspace.test.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/hooks/workspace.test.tsx)
- Create: [`frontend/src/components/workspace/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/index.tsx), [`frontend/src/components/workspace/pane.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/pane.tsx)
- Modify: [`frontend/src/atoms.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/atoms.ts), [`frontend/src/main.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/main.tsx), [`frontend/src/App.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/App.tsx)
- Modify: [`frontend/src/utils/routes.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/routes.ts), [`frontend/src/utils/routes.test.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/routes.test.ts), [`frontend/src/hooks/routes.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/hooks/routes.tsx), [`frontend/src/hooks/notes.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/hooks/notes.tsx)
- Modify (browser navigate → `useLocation`): [`editor-wrapper.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor-wrapper.tsx), [`editor/toolbar/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/toolbar/index.tsx), [`editor/plugins/link-click.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/plugins/link-click.tsx), [`note-component-container/component-controls.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/note-component-container/component-controls.tsx), [`file/media/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/file/media/index.tsx), [`code/code-actions.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/code/code-actions.tsx), [`file-sidebar/my-kernels-accordion/kernel-accordion-button.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/file-sidebar/my-kernels-accordion/kernel-accordion-button.tsx), [`context-menu/items.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/context-menu/items.tsx)
- Modify (history): [`file-sidebar/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/file-sidebar/index.tsx), [`command-palette/hooks/use-palette-commands.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/command-palette/hooks/use-palette-commands.tsx)
- Modify (focused-pane only): [`editor/hooks/toolbar.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/hooks/toolbar.ts) (`useSearchNoteEvent`)
- Modify: [`frontend/eslint.config.js`](file:///Users/etesam/Coding/bytebook/frontend/eslint.config.js)

**Diffs**:

```diff
--- /dev/null
+++ b/frontend/src/utils/workspace.ts
@@ -0,0 +1,230 @@
+import { safeDecodeURIComponent, splitPathSegments } from './path';
+
+/** One tab: its own wouter location and back/forward stack. */
+export type WorkspacePane = {
+  id: string;
+  // wouter locations, e.g. `/notes/Folder/Note.md`
+  history: string[];
+  historyIndex: number;
+};
+
+export type EditorGroup = {
+  type: 'group';
+  id: string;
+  tabs: WorkspacePane[];
+  activeTabId: string;
+};
+
+export type WorkspaceSplit = {
+  type: 'split';
+  id: string;
+  direction: 'row' | 'column';
+  children: WorkspaceNode[];
+  // flex-grow weights, parallel to children
+  sizes: number[];
+};
+
+export type WorkspaceNode = EditorGroup | WorkspaceSplit;
+
+export type Workspace = { root: WorkspaceNode; focusedGroupId: string };
+
+const MAX_HISTORY = 50;
+
+export function createPane(location: string): WorkspacePane {
+  return { id: crypto.randomUUID(), history: [location], historyIndex: 0 };
+}
+
+export function createGroup(pane: WorkspacePane): EditorGroup {
+  return {
+    type: 'group',
+    id: crypto.randomUUID(),
+    tabs: [pane],
+    activeTabId: pane.id,
+  };
+}
+
+export function createWorkspace(location = '/'): Workspace {
+  const group = createGroup(createPane(location));
+  return { root: group, focusedGroupId: group.id };
+}
+
+export function getPaneLocation(pane: WorkspacePane): string {
+  return pane.history[pane.historyIndex] ?? '/';
+}
+
+/** Groups in reading order; the first one is always the top-left group. */
+export function getGroups(node: WorkspaceNode): EditorGroup[] {
+  return node.type === 'group' ? [node] : node.children.flatMap(getGroups);
+}
+
+export function getAllPanes(workspace: Workspace): WorkspacePane[] {
+  return getGroups(workspace.root).flatMap((group) => group.tabs);
+}
+
+export function findGroup(
+  workspace: Workspace,
+  groupId: string
+): EditorGroup | null {
+  return getGroups(workspace.root).find(({ id }) => id === groupId) ?? null;
+}
+
+export function findGroupOfPane(
+  workspace: Workspace,
+  paneId: string
+): EditorGroup | null {
+  return (
+    getGroups(workspace.root).find((group) =>
+      group.tabs.some(({ id }) => id === paneId)
+    ) ?? null
+  );
+}
+
+export function getFocusedGroup(workspace: Workspace): EditorGroup {
+  return (
+    findGroup(workspace, workspace.focusedGroupId) ??
+    getGroups(workspace.root)[0]
+  );
+}
+
+export function getActivePane(group: EditorGroup): WorkspacePane {
+  return group.tabs.find(({ id }) => id === group.activeTabId) ?? group.tabs[0];
+}
+
+/** The pane global navigation (tree, palette, sidebar links) acts on. */
+export function getFocusedPane(workspace: Workspace): WorkspacePane {
+  return getActivePane(getFocusedGroup(workspace));
+}
+
+export function findPane(
+  workspace: Workspace,
+  paneId: string
+): WorkspacePane | null {
+  return getAllPanes(workspace).find(({ id }) => id === paneId) ?? null;
+}
+
+// Applies `update` to every group; returns the same objects where nothing changed.
+export function mapGroups(
+  workspace: Workspace,
+  update: (group: EditorGroup) => EditorGroup
+): Workspace {
+  const mapNode = (node: WorkspaceNode): WorkspaceNode => {
+    if (node.type === 'group') return update(node);
+    const children = node.children.map(mapNode);
+    return children.every((child, i) => child === node.children[i])
+      ? node
+      : { ...node, children };
+  };
+  const root = mapNode(workspace.root);
+  return root === workspace.root ? workspace : { ...workspace, root };
+}
+
+function mapPanes(
+  workspace: Workspace,
+  update: (pane: WorkspacePane) => WorkspacePane
+): Workspace {
+  return mapGroups(workspace, (group) => {
+    const tabs = group.tabs.map(update);
+    return tabs.every((tab, i) => tab === group.tabs[i])
+      ? group
+      : { ...group, tabs };
+  });
+}
+
+export function navigatePane(
+  workspace: Workspace,
+  {
+    paneId,
+    to,
+    replace = false,
+  }: { paneId: string; to: string; replace?: boolean }
+): Workspace {
+  return mapPanes(workspace, (pane) => {
+    if (pane.id !== paneId || getPaneLocation(pane) === to) return pane;
+    if (replace) return replaceCurrentLocation(pane, to);
+    const history = [
+      ...pane.history.slice(0, pane.historyIndex + 1),
+      to,
+    ].slice(-MAX_HISTORY);
+    return { ...pane, history, historyIndex: history.length - 1 };
+  });
+}
+
+export function stepPaneHistory(
+  workspace: Workspace,
+  { paneId, delta }: { paneId: string; delta: -1 | 1 }
+): Workspace {
+  return mapPanes(workspace, (pane) => {
+    const historyIndex = pane.historyIndex + delta;
+    if (
+      pane.id !== paneId ||
+      historyIndex < 0 ||
+      historyIndex >= pane.history.length
+    ) {
+      return pane;
+    }
+    return { ...pane, historyIndex };
+  });
+}
+
+/** Focuses the pane's group; the pane is already that group's visible tab. */
+export function focusPane(workspace: Workspace, paneId: string): Workspace {
+  const group = findGroupOfPane(workspace, paneId);
+  return !group || group.id === workspace.focusedGroupId
+    ? workspace
+    : { ...workspace, focusedGroupId: group.id };
+}
+
+// Rewrites every history entry so back/forward survive renames.
+export function remapPaneLocations(
+  workspace: Workspace,
+  remap: (location: string) => string | null
+): Workspace {
+  return mapPanes(workspace, (pane) => {
+    const history = pane.history.map((location) => remap(location) ?? location);
+    return history.every((location, i) => location === pane.history[i])
+      ? pane
+      : { ...pane, history };
+  });
+}
+
+function replaceCurrentLocation(pane: WorkspacePane, to: string): WorkspacePane {
+  const history = pane.history.map((location, i) =>
+    i === pane.historyIndex ? to : location
+  );
+  return { ...pane, history };
+}
+
+// Replaces each pane's current entry when `resolve` returns a new location.
+export function replacePaneLocations(
+  workspace: Workspace,
+  resolve: (location: string) => string | null
+): Workspace {
+  return mapPanes(workspace, (pane) => {
+    const target = resolve(getPaneLocation(pane));
+    return target === null || target === getPaneLocation(pane)
+      ? pane
+      : replaceCurrentLocation(pane, target);
+  });
+}
+
+// Vault path for a `/notes/*` location, normalized like useDecodedNotesWildcardPath.
+export function getNotesPathFromLocation(location: string): string | null {
+  if (!location.startsWith('/notes/')) return null;
+  const path = splitPathSegments(
+    safeDecodeURIComponent(location.slice('/notes/'.length))
+  ).join('/');
+  return path || null;
+}
+
+export function getNotesLocation(path: string): string {
+  return `/notes/${splitPathSegments(path).map(encodeURIComponent).join('/')}`;
+}
+
+export function parseWorkspace(raw: string | null): Workspace | null {
+  // …JSON.parse in try/catch. Validate the tree recursively: groups need a
+  // string id, a non-empty `tabs` array of panes (string id, non-empty string
+  // history, in-range historyIndex), and an activeTabId naming one of them;
+  // splits need children.length === sizes.length >= 2. Pane and group ids
+  // must be unique, and focusedGroupId must name a group. Return null otherwise.
+}
```

```diff
--- a/frontend/src/atoms.ts
+++ b/frontend/src/atoms.ts
@@
+import {
+  createWorkspace,
+  findPane,
+  getFocusedPane,
+  getPaneLocation,
+  parseWorkspace,
+  type Workspace,
+} from '@utils/workspace';
@@ (after mostRecentItemsAtom)
+const WORKSPACE_STORAGE_KEY = 'workspace';
+
+// Launch (`/?restore`) reopens the saved workspace; other windows and e2e
+// `page.goto` start from the URL they were opened at.
+function initializeWorkspace(): Workspace {
+  if (new URLSearchParams(window.location.search).has('restore')) {
+    const lastItem = initializeMostRecentItems()[0];
+    const lastUrl =
+      lastItem?.type === 'folder'
+        ? lastItem.encodedFolderUrl
+        : lastItem?.encodedFileUrl;
+    return (
+      parseWorkspace(localStorage.getItem(WORKSPACE_STORAGE_KEY)) ??
+      createWorkspace(lastUrl)
+    );
+  }
+  return createWorkspace(window.location.pathname);
+}
+
+const workspaceBaseAtom = atom<Workspace>(initializeWorkspace());
+
+// Groups, tabs, and per-tab history; persisted on every write.
+export const workspaceAtom = atom(
+  (get) => get(workspaceBaseAtom),
+  (get, set, update: Workspace | ((prev: Workspace) => Workspace)) => {
+    const prev = get(workspaceBaseAtom);
+    const next = typeof update === 'function' ? update(prev) : update;
+    if (next === prev) return;
+    logger.state('workspace', { prev, next });
+    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(next));
+    set(workspaceBaseAtom, next);
+  }
+);
+
+export const focusedPaneIdAtom = atom(
+  (get) => getFocusedPane(get(workspaceAtom)).id
+);
+
+export const focusedPaneLocationAtom = atom((get) =>
+  getPaneLocation(getFocusedPane(get(workspaceAtom)))
+);
+
+// Derived per pane so a navigation re-renders only that pane's route consumers.
+export const paneLocationAtomFamily = atomFamily((paneId: string) =>
+  atom((get) => {
+    const pane = findPane(get(workspaceAtom), paneId);
+    return pane ? getPaneLocation(pane) : '/';
+  })
+);
```

`useRestoreLastVisitedOnLaunch`'s job moves into `initializeWorkspace`. That hook, `useHistoryNavigationEvents`, `useSyncRouteWithRenames`, and `useSyncRouteWithDeletions` are deleted from `hooks/routes.tsx`. Their replacements live in `hooks/workspace.tsx`:

```diff
--- /dev/null
+++ b/frontend/src/hooks/workspace.tsx
@@ -0,0 +1,150 @@
+import { useQueryClient } from '@tanstack/react-query';
+import { useAtomValue, useSetAtom, useStore } from 'jotai';
+import { createContext, use, useEffect, useState, type ReactNode } from 'react';
+import { Router } from 'wouter';
+import {
+  focusedPaneIdAtom,
+  focusedPaneLocationAtom,
+  paneLocationAtomFamily,
+  workspaceAtom,
+} from '@/atoms';
+import { useWailsEvent } from './events';
+import {
+  FILE_DELETE,
+  FILE_RENAME,
+  FOLDER_DELETE,
+  FOLDER_RENAME,
+  isEventInCurrentWindow,
+  NAVIGATE_BACK,
+  NAVIGATE_FORWARD,
+} from '@utils/events';
+import { remapPathThroughRenames, stripTrailingSlash, type PathRename } from '@utils/path';
+import { queryKeys } from '@utils/query-keys';
+import { redirectPanesFromDeletedPaths, stepFocusedPaneHistory } from '@utils/routes';
+import {
+  getAllPanes,
+  getFocusedPane,
+  getNotesLocation,
+  getNotesPathFromLocation,
+  getPaneLocation,
+  navigatePane,
+  remapPaneLocations,
+} from '@utils/workspace';
+
+const PaneIdContext = createContext<string | null>(null);
+
+export function usePaneId(): string | null {
+  return use(PaneIdContext);
+}
+
+export function useIsFocusedPane(): boolean {
+  return useAtomValue(focusedPaneIdAtom) === usePaneId();
+}
+
+// Replaces wouter's browser-location hook; `null` follows the focused pane.
+function usePaneLocation(paneId: string | null) {
+  const location = useAtomValue(
+    paneId ? paneLocationAtomFamily(paneId) : focusedPaneLocationAtom
+  );
+  const setWorkspace = useSetAtom(workspaceAtom);
+  const navigate = (to: string, options?: { replace?: boolean }) =>
+    setWorkspace((workspace) =>
+      navigatePane(workspace, {
+        paneId: paneId ?? getFocusedPane(workspace).id,
+        to,
+        replace: options?.replace,
+      })
+    );
+  return [location, navigate] as [string, typeof navigate];
+}
+
+function useFocusedPaneLocation() {
+  return usePaneLocation(null);
+}
+
+function createPaneLocationHook(paneId: string) {
+  return function usePaneRouterLocation() {
+    return usePaneLocation(paneId);
+  };
+}
+
+/** App shell router: sidebar, palette, and global hooks see the focused pane. */
+export function FocusedPaneRouter({ children }: { children: ReactNode }) {
+  return <Router hook={useFocusedPaneLocation}>{children}</Router>;
+}
+
+/** Scopes `useLocation`/`useRoute` (and every *FromRoute hook) to one pane. */
+export function PaneRouter({
+  paneId,
+  children,
+}: {
+  paneId: string;
+  children: ReactNode;
+}) {
+  const [hook] = useState(() => createPaneLocationHook(paneId));
+  return (
+    <PaneIdContext value={paneId}>
+      <Router hook={hook}>{children}</Router>
+    </PaneIdContext>
+  );
+}
+
+// Keeps the URL on the focused pane for reloads and e2e assertions; `?restore` survives.
+export function useMirrorFocusedPaneToUrl(): void {
+  const location = useAtomValue(focusedPaneLocationAtom);
+  useEffect(() => {
+    if (window.location.pathname === location) return;
+    window.history.replaceState(null, '', location + window.location.search);
+  }, [location]);
+}
+
+export function useWorkspaceHistoryEvents(): void {
+  useWailsEvent(NAVIGATE_BACK, (event) => {
+    void (async () => {
+      if (!(await isEventInCurrentWindow(event))) return;
+      stepFocusedPaneHistory(-1);
+    })();
+  });
+  useWailsEvent(NAVIGATE_FORWARD, (event) => {
+    void (async () => {
+      if (!(await isEventInCurrentWindow(event))) return;
+      stepFocusedPaneHistory(1);
+    })();
+  });
+}
+
+/** Keeps every pane (and its history) pointed at renamed notes and folders. */
+export function useSyncWorkspaceWithRenames(): void {
+  const store = useStore();
+  const queryClient = useQueryClient();
+
+  const applyRenames = ({
+    renames,
+    isFolder,
+  }: {
+    renames: readonly PathRename[];
+    isFolder: boolean;
+  }) => {
+    const prev = store.get(workspaceAtom);
+    const next = remapPaneLocations(prev, (location) => {
+      const path = getNotesPathFromLocation(location);
+      const remapped = path && remapPathThroughRenames({ path, renames, isFolder });
+      return remapped ? getNotesLocation(remapped) : null;
+    });
+    if (next === prev) return;
+    // Hand known existence results to the new keys so editors don't flash a loading state.
+    for (const pane of getAllPanes(prev)) {
+      const oldPath = getNotesPathFromLocation(getPaneLocation(pane));
+      const newPane = getAllPanes(next).find(({ id }) => id === pane.id);
+      const newPath = newPane && getNotesPathFromLocation(getPaneLocation(newPane));
+      if (!oldPath || !newPath || oldPath === newPath) continue;
+      const exists = queryClient.getQueryData<boolean>(queryKeys.doesNoteExist(oldPath));
+      if (exists !== undefined) {
+        queryClient.setQueryData(queryKeys.doesNoteExist(newPath), exists);
+      }
+    }
+    store.set(workspaceAtom, next);
+  };
+
+  useWailsEvent(FOLDER_RENAME, (event) => {
+    // …same event.data mapping as the old useSyncRouteWithRenames…
+    applyRenames({ renames, isFolder: true });
+  });
+  useWailsEvent(FILE_RENAME, (event) => {
+    applyRenames({ renames, isFolder: false });
+  });
+}
+
+// External deletions bypass the trash mutation, so every window handles them here.
+export function useSyncWorkspaceWithDeletions(): void {
+  const setWorkspace = useSetAtom(workspaceAtom);
+  const queryClient = useQueryClient();
+
+  const handleDeletion = ({
+    paths,
+    includeDescendants,
+  }: {
+    paths: string[];
+    includeDescendants: boolean;
+  }) => {
+    const normalizedPaths = paths.map(stripTrailingSlash).filter(Boolean);
+    setWorkspace((workspace) =>
+      redirectPanesFromDeletedPaths(workspace, {
+        paths: normalizedPaths,
+        includeDescendants,
+      })
+    );
+    // …existing setQueriesData(false) + invalidation from commit 1, unchanged: it must
+    // still run after the redirect and before editors unmount, or their flush recreates the note…
+  };
+  // …FILE_DELETE / FOLDER_DELETE listeners, unchanged…
+}
```

```diff
--- a/frontend/src/utils/routes.ts
+++ b/frontend/src/utils/routes.ts
@@
-import { navigate } from 'wouter/use-browser-location';
+import { getDefaultStore } from 'jotai';
+import { workspaceAtom } from '@/atoms';
 import {
   createFolderPath,
   stripTrailingSlash,
   type FilePath,
   type FolderPath,
 } from './path';
 import { FOLDER_TYPE } from './tree-item-types';
+import {
+  getFocusedPane,
+  getNotesPathFromLocation,
+  navigatePane,
+  replacePaneLocations,
+  stepPaneHistory,
+  type Workspace,
+} from './workspace';
+
+/** Navigates the focused pane from outside React (tree callbacks, palette actions). */
+export function navigateFocusedPane(to: string, options?: { replace?: boolean }) {
+  getDefaultStore().set(workspaceAtom, (workspace) =>
+    navigatePane(workspace, {
+      paneId: getFocusedPane(workspace).id,
+      to,
+      replace: options?.replace,
+    })
+  );
+}
+
+export function stepFocusedPaneHistory(delta: -1 | 1) {
+  getDefaultStore().set(workspaceAtom, (workspace) =>
+    stepPaneHistory(workspace, { paneId: getFocusedPane(workspace).id, delta })
+  );
+}

 /** Navigates to the route for a typed file or folder path. */
 export function navigateToPath(
   target: FilePath | FolderPath,
   options?: { replace?: boolean }
 ) {
-  navigate(
+  navigateFocusedPane(
     target.type === FOLDER_TYPE
       ? target.encodedFolderUrl
       : target.encodedFileUrl,
     options
   );
 }
@@ (after getNavigationTargetForDeletedPaths)
+/** Sends every pane showing a deleted path (or a descendant) to its parent folder. */
+export function redirectPanesFromDeletedPaths(
+  workspace: Workspace,
+  {
+    paths,
+    includeDescendants = true,
+  }: { paths: readonly string[]; includeDescendants?: boolean }
+): Workspace {
+  return replacePaneLocations(workspace, (location) =>
+    getNavigationTargetForDeletedPaths({
+      currentRoutePath: getNotesPathFromLocation(location),
+      paths,
+      includeDescendants,
+    })
+  );
+}
```

(Confirm there's no import cycle: `atoms.ts` must not import `utils/routes.ts`.)

```diff
--- /dev/null
+++ b/frontend/src/components/workspace/pane.tsx
@@ -0,0 +1,55 @@
+import { lazy, Suspense } from 'react';
+import { useSetAtom } from 'jotai';
+import { Route, Switch } from 'wouter';
+import { workspaceAtom } from '@/atoms';
+import { EditorWrapper } from '@components/editor-wrapper';
+import { RouteFallback } from '@components/route-fallback';
+import { PaneRouter } from '@hooks/workspace';
+import { NotFound } from '@/routes/not-found';
+import { routeUrls } from '@utils/routes';
+import { focusPane } from '@utils/workspace';
+
+const KernelInfo = lazy(() =>
+  import('@/routes/kernel-info').then((module) => ({
+    default: module.KernelInfo,
+  }))
+);
+
+export function Pane({ paneId }: { paneId: string }) {
+  const setWorkspace = useSetAtom(workspaceAtom);
+  const focus = () => setWorkspace((workspace) => focusPane(workspace, paneId));
+
+  return (
+    <section
+      data-pane-id={paneId}
+      className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col"
+      // Capture phase: the pane is focused before its own handlers navigate.
+      onPointerDownCapture={focus}
+      onFocusCapture={focus}
+    >
+      <PaneRouter paneId={paneId}>
+        <Switch>
+          <Route path={routeUrls.patterns.ROOT} />
+          <Route path={routeUrls.patterns.NOTES}>
+            <EditorWrapper />
+          </Route>
+          <Route path={routeUrls.patterns.NOT_FOUND_FALLBACK}>
+            <NotFound />
+          </Route>
+          <Route path={routeUrls.patterns.KERNELS}>
+            <Suspense fallback={<RouteFallback />}>
+              <KernelInfo />
+            </Suspense>
+          </Route>
+          <Route path={routeUrls.patterns.CATCH_ALL}>
+            <NotFound />
+          </Route>
+        </Switch>
+      </PaneRouter>
+    </section>
+  );
+}
```

```diff
--- /dev/null
+++ b/frontend/src/components/workspace/index.tsx
@@ -0,0 +1,9 @@
+import { useAtomValue } from 'jotai';
+import { focusedPaneIdAtom } from '@/atoms';
+import { Pane } from './pane';
+
+/** Single pane for now; commit 3 adds tabs, commit 4 adds groups. */
+export function Workspace() {
+  const paneId = useAtomValue(focusedPaneIdAtom);
+  return <Pane key={paneId} paneId={paneId} />;
+}
```

App hooks run in `App`'s body, so the router has to wrap `App`:

```diff
--- a/frontend/src/main.tsx
+++ b/frontend/src/main.tsx
@@
 import App from '@/App';
+import { FocusedPaneRouter } from '@hooks/workspace';
@@
     <QueryClientProvider client={queryClient}>
-      <App />
+      <FocusedPaneRouter>
+        <App />
+      </FocusedPaneRouter>
     </QueryClientProvider>
```

```diff
--- a/frontend/src/App.tsx
+++ b/frontend/src/App.tsx
@@
-import { lazy, type ReactNode, Suspense } from 'react';
+import { type ReactNode } from 'react';
 import { RouterProvider } from 'react-aria-components';
-import { NotFound } from '@/routes/not-found';
@@
-import { Route, Switch, useLocation } from 'wouter';
+import { useLocation } from 'wouter';
@@
-import { routeUrls } from '@utils/routes';
-import { RouteFallback } from '@components/route-fallback';
 import { useZoom, useFullscreen } from '@hooks/resize';
 import {
-  useHistoryNavigationEvents,
   useRecordRecentItem,
-  useRestoreLastVisitedOnLaunch,
   useSyncFileMaximizedWithRoute,
-  useSyncRouteWithRenames,
-  useSyncRouteWithDeletions,
 } from '@hooks/routes';
-import { EditorWrapper } from '@components/editor-wrapper';
+import {
+  useMirrorFocusedPaneToUrl,
+  useSyncWorkspaceWithDeletions,
+  useSyncWorkspaceWithRenames,
+  useWorkspaceHistoryEvents,
+} from '@hooks/workspace';
+import { Workspace } from '@components/workspace';
@@
-const KernelInfo = lazy(() =>
-  …
-);
@@
-  useHistoryNavigationEvents();
+  useWorkspaceHistoryEvents();
   useRecordRecentItem();
-  useRestoreLastVisitedOnLaunch();
   useSyncFileMaximizedWithRoute();
-  useSyncRouteWithRenames();
-  useSyncRouteWithDeletions();
+  useSyncWorkspaceWithRenames();
+  useSyncWorkspaceWithDeletions();
+  useMirrorFocusedPaneToUrl();
@@
         <div id="main-content" className="flex-1 min-w-0 h-full">
-          <Switch>
-            …
-          </Switch>
+          <Workspace />
         </div>
```

The trash mutation redirects every affected pane, not just the focused one:

```diff
--- a/frontend/src/hooks/notes.tsx
+++ b/frontend/src/hooks/notes.tsx
@@
-import { useAtomValue, useStore } from 'jotai/react';
+import { useAtomValue, useSetAtom, useStore } from 'jotai/react';
-import { navigate } from 'wouter/use-browser-location';
@@
-import { projectSettingsAtom } from '@/atoms';
+import { projectSettingsAtom, workspaceAtom } from '@/atoms';
@@
-import { getNavigationTargetForDeletedPaths } from '@utils/routes';
+import { redirectPanesFromDeletedPaths } from '@utils/routes';
@@
-import { useFilePathFromRoute, useFolderPathFromRoute } from './routes';
@@ export function useMoveToTrashMutation() {
   const { mutate: restoreFromTrash } = useRestoreFromTrashMutation();
-  const currentRouteFilePath = useFilePathFromRoute();
-  const currentRouteFolderPath = useFolderPathFromRoute();
-
-  /** The currently-viewed path (file or folder), if any. */
-  const currentRoutePath =
-    currentRouteFilePath?.fullPath ?? currentRouteFolderPath?.fullPath ?? null;
+  const setWorkspace = useSetAtom(workspaceAtom);
@@
     onMutate: ({ paths }) => {
-      // Navigate immediately if the current route was among the deleted paths
-      const navigationTarget = getNavigationTargetForDeletedPaths({
-        currentRoutePath,
-        paths,
-      });
-      if (navigationTarget) {
-        navigate(navigationTarget);
-      }
+      // Leave deleted items now; the watcher's delete event arrives later.
+      // Keep commit 1's setQueriesData(false) right after this so flushes skip the note.
+      setWorkspace((workspace) =>
+        redirectPanesFromDeletedPaths(workspace, { paths })
+      );
     },
```

Components inside a pane navigate their own pane, even when it isn't focused. A background pane's 404 redirect must not move the focused pane. The same pattern applies in every listed file:

```diff
--- a/frontend/src/components/editor-wrapper.tsx
+++ b/frontend/src/components/editor-wrapper.tsx
@@
-import { navigate } from 'wouter/use-browser-location';
+import { useLocation } from 'wouter';
@@ export function EditorWrapper() {
+  const [, navigate] = useLocation();
@@
-  }, [error, filePath, isLoading, isFetching, noteExists]);
+  }, [error, filePath, isLoading, isFetching, navigate, noteExists]);
```

```diff
--- a/frontend/src/components/editor/plugins/link-click.tsx
+++ b/frontend/src/components/editor/plugins/link-click.tsx
@@
-import { navigate } from 'wouter/use-browser-location';
+import { useLocation } from 'wouter';
@@ export function LinkClickPlugin(): null {
   const [editor] = useLexicalComposerContext();
+  const [, navigate] = useLocation();
@@
-  }, [editor]);
+  }, [editor, navigate]);
```

- `editor/toolbar/index.tsx`, `component-controls.tsx`, `file/media/index.tsx`, `code/code-actions.tsx`: `const [, navigate] = useLocation();` at the top of the component or hook that calls `navigate`.
- `kernel-accordion-button.tsx` and `context-menu/items.tsx` (inside `useContextMenuItems`): same. They render under `FocusedPaneRouter`, and pointer-down focuses a pane before any context menu opens from it.

```diff
--- a/frontend/src/components/file-sidebar/index.tsx
+++ b/frontend/src/components/file-sidebar/index.tsx
@@
-                onPress={() => window.history.back()}
+                onPress={() => stepFocusedPaneHistory(-1)}
@@
-                onPress={() => window.history.forward()}
+                onPress={() => stepFocusedPaneHistory(1)}
```

```diff
--- a/frontend/src/components/command-palette/hooks/use-palette-commands.tsx
+++ b/frontend/src/components/command-palette/hooks/use-palette-commands.tsx
@@
-      run: () => window.history.back(),
+      run: () => stepFocusedPaneHistory(-1),
@@
-      run: () => window.history.forward(),
+      run: () => stepFocusedPaneHistory(1),
```

⌘F reaches every editor, so only the focused pane toggles its find panel:

```diff
--- a/frontend/src/components/editor/hooks/toolbar.ts
+++ b/frontend/src/components/editor/hooks/toolbar.ts
@@ export function useSearchNoteEvent(): [
   const [isSearchOpen, setIsSearchOpen] = useState(false);
+  const isFocusedPane = useIsFocusedPane();

   useWailsEvent(SEARCH_NOTE, (data) => {
     void (async () => {
-      if (!(await isEventInCurrentWindow(data))) return;
+      if (!isFocusedPane || !(await isEventInCurrentWindow(data))) return;
```

(Check that `useWailsEvent` calls the latest callback. If it captures the first one, read `isFocusedPane` through a ref.)

The palette's current-note commands come from the focused pane only. Unfocused and hidden panes neither register nor clear them:

```diff
--- a/frontend/src/components/editor/hooks/palette-commands.ts
+++ b/frontend/src/components/editor/hooks/palette-commands.ts
@@ export function useNotePaletteCommands({
   const setCommands = useSetAtom(activeNoteCommandsAtom);
   const { titleInputId } = useEditorScope();
+  const isFocusedPane = useIsFocusedPane();
@@
   useEffect(() => {
     const path = createFilePath(`${folder}/${note}.md`);
-    if (!isReady || !path) return;
-    setCommands({
+    if (!isReady || !path || !isFocusedPane) return;
+    const commands = {
       path: path.fullPath,
@@
-    });
-    return () => setCommands(null);
+    };
+    setCommands(commands);
+    // Another pane may already have registered; only clear our own entry.
+    return () => setCommands((prev) => (prev === commands ? null : prev));
   }, [
     folder,
     note,
     isReady,
+    isFocusedPane,
```

```diff
--- a/frontend/eslint.config.js
+++ b/frontend/eslint.config.js
@@ (rules)
+      'no-restricted-imports': [
+        'error',
+        {
+          paths: [
+            {
+              name: 'wouter/use-browser-location',
+              message:
+                'Navigation is per pane: use useLocation() in components or navigateFocusedPane() elsewhere.',
+            },
+          ],
+        },
+      ],
```

**Tests** (`utils/workspace.test.ts`, `routes.test.ts`, `hooks/workspace.test.tsx`):

- `navigatePane`: push appends and truncates forward entries; replace keeps the forward stack; navigating to the current location returns the same object; history caps at 50.
- `stepPaneHistory`: clamps at both ends.
- `remapPaneLocations`: a folder rename rewrites descendants in every history entry and leaves unrelated panes referentially equal.
- `getNotesPathFromLocation` / `getNotesLocation`: round-trip spaces, `%`, and unicode, and match `createFilePath(...).encodedFileUrl`.
- `parseWorkspace`: rejects bad JSON, an empty group, an out-of-range `historyIndex`, an `activeTabId` outside its group, a duplicate id, and a split whose `sizes` length is wrong.
- `focusPane`: focuses the pane's group and returns the same object when it's already focused.
- `redirectPanesFromDeletedPaths`: two panes, one inside a deleted folder, and only that one moves to the parent.
- `PaneRouter` (Testing Library): two sibling `PaneRouter`s with different locations report different `useLocation()[0]`, and navigating in one leaves the other unchanged.

**Verification**:

```bash
bun check
cd frontend && bun run test:unit
cd frontend && bun run test:e2e navigation external-deletion folder-sidebar command-palette
rg "use-browser-location|window\.history\.(back|forward)" frontend/src   # expect no matches
```

Native: open a note and a folder, then ⌘[ / ⌘]. Rename the open note's folder from the tree; the editor follows. Delete the open note in Finder; the pane moves to its parent. Quit and relaunch; the last note reopens.

---


### Commit 3: `feat(tabs): add tab bar with keep-alive tabs`

**Rationale**: Tabs work on their own before a second group exists: one group, one tab strip, many tabs. The tab bar is already a per-group component, so commit 4 only has to render more of them. The maximize button, sidebar-toggle listener, and traffic-light padding move from the three per-view headers into the top-left group's tab bar. Window dragging switches to CSS regions so tabs can be dragged in commit 4.

**Files**:

- Modify: [`frontend/src/utils/workspace.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/workspace.ts), [`workspace.test.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/workspace.test.ts), [`frontend/src/atoms.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/atoms.ts)
- Create: [`frontend/src/components/workspace/editor-group.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/editor-group.tsx), [`frontend/src/components/workspace/tab-bar.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/tab-bar.tsx), [`frontend/src/icons/plus.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/icons/plus.tsx)
- Modify: [`frontend/src/components/workspace/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/index.tsx), [`frontend/src/hooks/workspace.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/hooks/workspace.tsx)
- Modify (remove maximize, toggle listener, padding, animation plumbing): [`editor/toolbar/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/toolbar/index.tsx), [`editor/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/index.tsx), [`note-renderer/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/note-renderer/index.tsx), [`routes/notes-sidebar/render-note/non-markdown-toolbar.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/routes/notes-sidebar/render-note/non-markdown-toolbar.tsx), [`folder-renderer/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/folder-renderer/index.tsx), [`folder-renderer/folder-renderer-header.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/folder-renderer/folder-renderer-header.tsx), [`editor-wrapper.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor-wrapper.tsx)
- Modify: [`frontend/src/components/file-sidebar/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/file-sidebar/index.tsx) (drag region), [`frontend/src/index.css`](file:///Users/etesam/Coding/bytebook/frontend/src/index.css)
- Modify: [`frontend/src/components/context-menu/items.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/context-menu/items.tsx), [`virtualized-file-tree/tree-context-menu.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/virtualized/virtualized-file-tree/tree-context-menu.tsx), [`editor/plugins/link-click.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/plugins/link-click.tsx), [`use-palette-commands.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/command-palette/hooks/use-palette-commands.tsx)
- Modify: [`internal/ui/window.go`](file:///Users/etesam/Coding/bytebook/internal/ui/window.go), [`internal/ui/menus/application_menu.go`](file:///Users/etesam/Coding/bytebook/internal/ui/menus/application_menu.go), [`internal/util/events.go`](file:///Users/etesam/Coding/bytebook/internal/util/events.go), [`frontend/src/utils/events.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/events.ts), regenerated `frontend/bindings/`
- Create: [`frontend/tests/e2e/specs/tabs.spec.ts`](file:///Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/tabs.spec.ts)

**Diffs**:

```diff
--- a/frontend/src/utils/workspace.ts
+++ b/frontend/src/utils/workspace.ts
@@
+function updateGroup(
+  workspace: Workspace,
+  groupId: string,
+  update: (group: EditorGroup) => EditorGroup
+): Workspace {
+  return mapGroups(workspace, (group) =>
+    group.id === groupId ? update(group) : group
+  );
+}
+
+// `index` defaults to just after the group's active tab, like VS Code.
+export function insertTab(
+  workspace: Workspace,
+  {
+    pane,
+    groupId,
+    index,
+    activate = true,
+  }: { pane: WorkspacePane; groupId: string; index?: number; activate?: boolean }
+): Workspace {
+  return updateGroup(workspace, groupId, (group) => {
+    const at =
+      index ?? group.tabs.findIndex(({ id }) => id === group.activeTabId) + 1;
+    const tabs = [...group.tabs];
+    tabs.splice(at, 0, pane);
+    return { ...group, tabs, activeTabId: activate ? pane.id : group.activeTabId };
+  });
+}
+
+export function openTab(
+  workspace: Workspace,
+  {
+    location,
+    groupId = workspace.focusedGroupId,
+    activate = true,
+  }: { location: string; groupId?: string; activate?: boolean }
+): Workspace {
+  return insertTab(workspace, { pane: createPane(location), groupId, activate });
+}
+
+/** Shows the tab in its group and focuses that group. */
+export function activateTab(workspace: Workspace, paneId: string): Workspace {
+  const group = findGroupOfPane(workspace, paneId);
+  if (!group) return workspace;
+  const next = updateGroup(workspace, group.id, (g) =>
+    g.activeTabId === paneId ? g : { ...g, activeTabId: paneId }
+  );
+  return focusPane(next, paneId);
+}
+
+// Activates the right neighbor like VS Code; the last tab leaves an empty workspace.
+export function closeTab(workspace: Workspace, paneId: string): Workspace {
+  const group = findGroupOfPane(workspace, paneId);
+  if (!group) return workspace;
+  const index = group.tabs.findIndex(({ id }) => id === paneId);
+  const tabs = group.tabs.filter(({ id }) => id !== paneId);
+  if (tabs.length === 0) return createWorkspace();
+  const activeTabId =
+    group.activeTabId === paneId
+      ? tabs[Math.min(index, tabs.length - 1)].id
+      : group.activeTabId;
+  return updateGroup(workspace, group.id, (g) => ({ ...g, tabs, activeTabId }));
+}
+
+export function closeOtherTabs(workspace: Workspace, paneId: string): Workspace {
+  const group = findGroupOfPane(workspace, paneId);
+  if (!group) return workspace;
+  return updateGroup(workspace, group.id, (g) => ({
+    ...g,
+    tabs: g.tabs.filter(({ id }) => id === paneId),
+    activeTabId: paneId,
+  }));
+}
+
+export function selectAdjacentTab(workspace: Workspace, delta: -1 | 1): Workspace {
+  const group = getFocusedGroup(workspace);
+  const index = group.tabs.findIndex(({ id }) => id === group.activeTabId);
+  const next = (index + delta + group.tabs.length) % group.tabs.length;
+  return activateTab(workspace, group.tabs[next].id);
+}
+
+export function getLocationTitle(location: string): string {
+  const notesPath = getNotesPathFromLocation(location);
+  if (notesPath) {
+    const name = splitPathSegments(notesPath).at(-1) ?? notesPath;
+    return name.endsWith('.md') ? name.slice(0, -'.md'.length) : name;
+  }
+  if (location.startsWith('/kernels/')) {
+    return safeDecodeURIComponent(location.slice('/kernels/'.length));
+  }
+  return location === '/404' ? 'Not Found' : 'New Tab';
+}
+
+export function getPaneTitle(pane: WorkspacePane): string {
+  return getLocationTitle(getPaneLocation(pane));
+}
```

```diff
--- a/frontend/src/atoms.ts
+++ b/frontend/src/atoms.ts
@@ (after focusedPaneIdAtom)
+export const focusedGroupIdAtom = atom(
+  (get) => getFocusedGroup(get(workspaceAtom)).id
+);
```

```diff
--- a/frontend/src/components/workspace/index.tsx
+++ b/frontend/src/components/workspace/index.tsx
@@
-import { useAtomValue } from 'jotai';
-import { focusedPaneIdAtom } from '@/atoms';
-import { Pane } from './pane';
+import { useAtomValue } from 'jotai';
+import { motion, useAnimationControls } from 'motion/react';
+import { workspaceAtom } from '@/atoms';
+import { useToggleSidebarEvent } from '@/routes/notes-sidebar/render-note/hooks';
+import { useTabCommandEvents } from '@hooks/workspace';
+import { EditorGroupView } from './editor-group';

-/** Single pane for now; commit 3 adds tabs, commit 4 splits. */
 export function Workspace() {
-  const paneId = useAtomValue(focusedPaneIdAtom);
-  return <Pane key={paneId} paneId={paneId} />;
+  const { root } = useAtomValue(workspaceAtom);
+  // The sidebar-toggle nudge used to live in each view header.
+  const animationControls = useAnimationControls();
+  useToggleSidebarEvent(animationControls);
+  useTabCommandEvents();
+
+  return (
+    <motion.div animate={animationControls} className="flex h-full min-w-0">
+      {/* One group until commit 4 renders the split tree. */}
+      {root.type === 'group' && (
+        <EditorGroupView
+          group={root}
+          isTopLeft
+          isTopRow
+          animationControls={animationControls}
+        />
+      )}
+    </motion.div>
+  );
 }
```

```diff
--- /dev/null
+++ b/frontend/src/components/workspace/editor-group.tsx
@@ -0,0 +1,60 @@
+import { Activity } from 'react';
+import { useAtomValue, useSetAtom } from 'jotai';
+import type { LegacyAnimationControls } from 'motion/react';
+import { TabPanel, TabPanels, Tabs } from 'react-aria-components';
+import { focusedGroupIdAtom, workspaceAtom } from '@/atoms';
+import { cn } from '@utils/string-formatting';
+import { activateTab, type EditorGroup } from '@utils/workspace';
+import { Pane } from './pane';
+import { GroupTabBar } from './tab-bar';
+
+export function EditorGroupView({
+  group,
+  isTopLeft,
+  isTopRow,
+  animationControls,
+}: {
+  group: EditorGroup;
+  // Owns the maximize button and clears the traffic lights.
+  isTopLeft: boolean;
+  // Its empty tab-bar space drags the window.
+  isTopRow: boolean;
+  animationControls: LegacyAnimationControls;
+}) {
+  const setWorkspace = useSetAtom(workspaceAtom);
+  const isFocused = useAtomValue(focusedGroupIdAtom) === group.id;
+
+  return (
+    <Tabs
+      data-group-id={group.id}
+      selectedKey={group.activeTabId}
+      onSelectionChange={(key) =>
+        setWorkspace((prev) => activateTab(prev, String(key)))
+      }
+      className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
+    >
+      <GroupTabBar
+        group={group}
+        isFocused={isFocused}
+        isTopLeft={isTopLeft}
+        isTopRow={isTopRow}
+        animationControls={animationControls}
+      />
+      <TabPanels items={group.tabs} className="flex min-h-0 min-w-0 flex-1">
+        {(pane) => (
+          <TabPanel
+            id={pane.id}
+            shouldForceMount
+            className={({ isInert }) =>
+              cn('flex min-h-0 min-w-0 flex-1 outline-none', isInert && 'hidden')
+            }
+          >
+            {({ isInert }) => (
+              // Hidden tabs keep editor state; effects pause until shown.
+              <Activity mode={isInert ? 'hidden' : 'visible'}>
+                <Pane paneId={pane.id} />
+              </Activity>
+            )}
+          </TabPanel>
+        )}
+      </TabPanels>
+    </Tabs>
+  );
+}
```

(Confirm `TabPanelRenderProps` exposes `isInert` in the installed react-aria-components. If it doesn't, compare `pane.id === group.activeTabId`.)

```diff
--- /dev/null
+++ b/frontend/src/components/workspace/tab-bar.tsx
@@ -0,0 +1,135 @@
+import { useAtomValue, useSetAtom } from 'jotai';
+import type { LegacyAnimationControls } from 'motion/react';
+import { Tab, TabList } from 'react-aria-components';
+import {
+  contextMenuDataAtom,
+  isFileMaximizedAtom,
+  isFullscreenAtom,
+  workspaceAtom,
+} from '@/atoms';
+import { getDefaultButtonVariants } from '@/animations';
+import { Plus } from '@/icons/plus';
+import { XMark } from '@/icons/xmark';
+import { MotionIconButton } from '@components/buttons';
+import { MaximizeNoteButton } from '@components/buttons/maximize-note';
+import { MenuItemLabel } from '@components/context-menu/items';
+import { Tooltip } from '@components/tooltip';
+import { cn } from '@utils/string-formatting';
+import {
+  closeOtherTabs,
+  closeTab,
+  getPaneTitle,
+  openTab,
+  type EditorGroup,
+  type WorkspacePane,
+} from '@utils/workspace';
+
+// Empty bar space drags the window; controls opt out (Wails reads this custom property).
+const NO_WINDOW_DRAG = '[--wails-draggable:no-drag]';
+
+export function GroupTabBar({
+  group,
+  isFocused,
+  isTopLeft,
+  isTopRow,
+  animationControls,
+}: {
+  group: EditorGroup;
+  isFocused: boolean;
+  isTopLeft: boolean;
+  isTopRow: boolean;
+  animationControls: LegacyAnimationControls;
+}) {
+  const setWorkspace = useSetAtom(workspaceAtom);
+  const isFileMaximized = useAtomValue(isFileMaximizedAtom);
+  const isFullscreen = useAtomValue(isFullscreenAtom);
+
+  return (
+    <div
+      className={cn(
+        'flex h-(--app-header-height) shrink-0 items-center gap-1.5 border-b border-zinc-200 px-2 dark:border-zinc-700',
+        isTopRow && '[--wails-draggable:drag]',
+        // Clear the traffic lights when the sidebar no longer sits under them.
+        isTopLeft && isFileMaximized && !isFullscreen && 'pl-[100px]'
+      )}
+    >
+      {isTopLeft && (
+        <div className={NO_WINDOW_DRAG}>
+          <MaximizeNoteButton animationControls={animationControls} />
+        </div>
+      )}
+      <TabList
+        aria-label="Open tabs"
+        data-group-tab-list={group.id}
+        items={group.tabs}
+        className={cn('flex min-w-0 items-center gap-1 overflow-x-auto', NO_WINDOW_DRAG)}
+      >
+        {(pane) => <WorkspaceTabItem pane={pane} isGroupFocused={isFocused} />}
+      </TabList>
+      <Tooltip content="New tab" shortcut="⌘T" placement="bottom">
+        <MotionIconButton
+          {...getDefaultButtonVariants()}
+          aria-label="New tab"
+          className={NO_WINDOW_DRAG}
+          onPress={() =>
+            setWorkspace((prev) => openTab(prev, { location: '/', groupId: group.id }))
+          }
+        >
+          <Plus width="1rem" height="1rem" />
+        </MotionIconButton>
+      </Tooltip>
+      <div className="flex-1 self-stretch" />
+    </div>
+  );
+}
+
+function WorkspaceTabItem({
+  pane,
+  isGroupFocused,
+}: {
+  pane: WorkspacePane;
+  isGroupFocused: boolean;
+}) {
+  const setWorkspace = useSetAtom(workspaceAtom);
+  const setContextMenuData = useSetAtom(contextMenuDataAtom);
+  const close = () => setWorkspace((prev) => closeTab(prev, pane.id));
+
+  return (
+    <Tab
+      id={pane.id}
+      data-tab-id={pane.id}
+      className={({ isSelected, isFocusVisible }) =>
+        cn(
+          'group relative flex h-8 min-w-24 max-w-52 shrink cursor-default select-none items-center gap-1 rounded-md pl-2.5 pr-1 text-sm outline-none',
+          isSelected
+            ? 'bg-zinc-150 dark:bg-zinc-700'
+            : 'hover:bg-zinc-100 dark:hover:bg-zinc-750',
+          // VS Code marks the active tab of the focused group only.
+          isSelected &&
+            isGroupFocused &&
+            'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-(--accent-color)',
+          !isGroupFocused && 'text-zinc-500 dark:text-zinc-400',
+          isFocusVisible && 'ring-2 ring-(--accent-color)'
+        )
+      }
+      onAuxClick={(e) => {
+        if (e.button === 1) close();
+      }}
+      onContextMenu={(e) => {
+        e.preventDefault();
+        e.stopPropagation();
+        setContextMenuData({
+          x: e.clientX,
+          y: e.clientY,
+          isShowing: true,
+          targetId: null,
+          items: [
+            { value: 'close-tab', label: <MenuItemLabel icon={<XMark />}>Close Tab</MenuItemLabel>, onChange: close },
+            {
+              value: 'close-other-tabs',
+              label: <MenuItemLabel icon={<XMark />}>Close Other Tabs</MenuItemLabel>,
+              onChange: () => setWorkspace((prev) => closeOtherTabs(prev, pane.id)),
+            },
+          ],
+        });
+      }}
+    >
+      <span className="flex-1 truncate">{getPaneTitle(pane)}</span>
+      {/* Presentational: role=tab can't nest a button; ⌘W and the context menu cover keyboard users. */}
+      <span
+        aria-hidden
+        className="rounded p-0.5 opacity-0 hover:bg-zinc-200 group-hover:opacity-100 group-data-[selected]:opacity-100 dark:hover:bg-zinc-600"
+        onPointerDown={(e) => e.stopPropagation()}
+        onClick={(e) => {
+          e.stopPropagation();
+          close();
+        }}
+      >
+        <XMark width="0.75rem" height="0.75rem" />
+      </span>
+    </Tab>
+  );
+}
```

(Match `bg-zinc-150` / `zinc-750` to whichever shades the theme actually defines; the sidebar selection classes are the reference. `plus.tsx` copies `xmark.tsx`'s structure.)

```diff
--- a/frontend/src/hooks/workspace.tsx
+++ b/frontend/src/hooks/workspace.tsx
@@
+export function useTabCommandEvents(): void {
+  const setWorkspace = useSetAtom(workspaceAtom);
+  const updateIfCurrentWindow = (
+    event: WailsEvent,
+    update: (workspace: Workspace) => Workspace
+  ) => {
+    void (async () => {
+      if (!(await isEventInCurrentWindow(event))) return;
+      setWorkspace(update);
+    })();
+  };
+
+  useWailsEvent(TAB_NEW, (event) =>
+    updateIfCurrentWindow(event, (ws) => openTab(ws, { location: '/' }))
+  );
+  useWailsEvent(TAB_CLOSE, (event) =>
+    updateIfCurrentWindow(event, (ws) => closeTab(ws, getFocusedPane(ws).id))
+  );
+  useWailsEvent(TAB_NEXT, (event) =>
+    updateIfCurrentWindow(event, (ws) => selectAdjacentTab(ws, 1))
+  );
+  useWailsEvent(TAB_PREVIOUS, (event) =>
+    updateIfCurrentWindow(event, (ws) => selectAdjacentTab(ws, -1))
+  );
+}
```

Remove the per-view header duties:

```diff
--- a/frontend/src/components/editor/toolbar/index.tsx
+++ b/frontend/src/components/editor/toolbar/index.tsx
@@
-import { isFullscreenAtom, isFileMaximizedAtom } from '@/atoms';
@@
-import { MaximizeNoteButton } from '@components/buttons/maximize-note';
@@
-import { useToggleSidebarEvent } from '@/routes/notes-sidebar/render-note/hooks';
@@ export function Toolbar({
-  animationControls,
@@
-  animationControls: LegacyAnimationControls;
@@
-  const isFullscreen = useAtomValue(isFullscreenAtom);
-  const isFileMaximized = useAtomValue(isFileMaximizedAtom);
@@
-  useToggleSidebarEvent(animationControls);
@@
       <nav
-        className={cn(
-          'ml-[-4px] flex h-(--app-header-height) shrink-0 items-center gap-1.5 border-b border-b-zinc-200 px-2 dark:border-b-zinc-700',
-          isFileMaximized && !isFullscreen && 'pl-[100px]'
-        )}
+        className="ml-[-4px] flex h-(--pane-header-height) shrink-0 items-center gap-1.5 border-b border-b-zinc-200 px-2 dark:border-b-zinc-700"
       >
@@
         <span className="flex items-center gap-1.5">
-          <MaximizeNoteButton animationControls={animationControls} />
           <Dropdown
```

The same removal applies to:

- `non-markdown-toolbar.tsx`: drop the button, `useToggleSidebarEvent`, the `pl-23!` padding, and the `animationControls` prop; use `h-(--pane-header-height)`.
- `folder-renderer-header.tsx`: drop the absolutely positioned button and its `left-32` shift.
- `folder-renderer/index.tsx`: drop `useToggleSidebarEvent` and the `animationControls` prop.
- `note-renderer/index.tsx`: `motion.div animate={animationControls}` becomes a plain `div`; drop `useAnimationControls`.
- `editor/index.tsx` and `editor-wrapper.tsx`: drop `animationControls` props and `useAnimationControls`.

```diff
--- a/frontend/src/index.css
+++ b/frontend/src/index.css
@@
   --app-header-height: clamp(48px, calc(18px + 40px * var(--ui-scale)), 62px);
+  --pane-header-height: clamp(40px, calc(14px + 32px * var(--ui-scale)), 50px);
```

```diff
--- a/frontend/src/components/file-sidebar/index.tsx
+++ b/frontend/src/components/file-sidebar/index.tsx
@@
         <header
           className={cn(
-            'pr-2.5 flex gap-1 items-center justify-end w-full pl-[92px] h-(--app-header-height) shrink-0',
+            'pr-2.5 flex gap-1 items-center justify-end w-full pl-[92px] h-(--app-header-height) shrink-0 [--wails-draggable:drag]',
             isFullscreen && 'pl-[8px]'
           )}
         >
-          <span>
+          <span className="[--wails-draggable:no-drag]">
```

```diff
--- a/internal/ui/window.go
+++ b/internal/ui/window.go
@@
 		Mac: application.MacWindow{
-			InvisibleTitleBarHeight: 35,
+			// Drag regions come from CSS (--wails-draggable) so tabs in the top strip stay draggable.
 			TitleBar:                application.MacTitleBarHiddenInsetUnified,
```

```diff
--- a/internal/util/events.go
+++ b/internal/util/events.go
@@
 	EventNavigateBack        = "navigation:back"
 	EventNavigateForward     = "navigation:forward"
+	EventTabNew              = "tab:new"
+	EventTabClose            = "tab:close"
+	EventTabNext             = "tab:next"
+	EventTabPrevious         = "tab:previous"
@@
 	application.RegisterEvent[application.Void](EventNavigateForward)
+	application.RegisterEvent[application.Void](EventTabNew)
+	application.RegisterEvent[application.Void](EventTabClose)
+	application.RegisterEvent[application.Void](EventTabNext)
+	application.RegisterEvent[application.Void](EventTabPrevious)
```

```diff
--- a/internal/ui/menus/application_menu.go
+++ b/internal/ui/menus/application_menu.go
@@ func configureFileMenu(app *application.App, menu *application.Menu, bg application.RGBA, createWindow WindowCreator) {
 	sub := item.GetSubmenu()
+	// ⌘W closes the focused tab or pane; the window's own Close moves to ⇧⌘W.
+	if closeWindow := sub.FindByLabel("Close"); closeWindow != nil {
+		closeWindow.SetAccelerator("shift+cmdorctrl+w")
+	}
+	addTabItem(app, sub, "New Tab", "cmdorctrl+t", util.EventTabNew)
+	addTabItem(app, sub, "Close Tab", "cmdorctrl+w", util.EventTabClose)
+	addTabItem(app, sub, "Show Next Tab", "ctrl+tab", util.EventTabNext)
+	addTabItem(app, sub, "Show Previous Tab", "ctrl+shift+tab", util.EventTabPrevious)
 	newWin := sub.Add("New Window")
@@
+func addTabItem(app *application.App, sub *application.Menu, label, accelerator, event string) {
+	item := sub.Add(label)
+	item.SetAccelerator(accelerator)
+	item.OnClick(func(ctx *application.Context) {
+		if win := app.Window.Current(); win != nil {
+			win.EmitEvent(event)
+		}
+	})
+}
```

```diff
--- a/frontend/src/utils/events.ts
+++ b/frontend/src/utils/events.ts
@@
 export const NAVIGATE_FORWARD = 'navigation:forward';
+export const TAB_NEW = 'tab:new';
+export const TAB_CLOSE = 'tab:close';
+export const TAB_NEXT = 'tab:next';
+export const TAB_PREVIOUS = 'tab:previous';
```

Entry points for opening tabs:

```diff
--- a/frontend/src/components/context-menu/items.tsx
+++ b/frontend/src/components/context-menu/items.tsx
@@ export function useContextMenuItems() {
+  const setWorkspace = useSetAtom(workspaceAtom);
@@
+    openInNewTab: ({ path }: { path: FileOrFolderPath }): DropdownItem => ({
+      value: 'open-in-new-tab',
+      label: (
+        <MenuItemLabel icon={<Plus {...ICON_PROPS} />}>Open in New Tab</MenuItemLabel>
+      ),
+      onChange: () =>
+        setWorkspace((workspace) =>
+          openTab(workspace, {
+            location: path.type === 'folder' ? path.encodedFolderUrl : path.encodedFileUrl,
+          })
+        ),
+    }),
```

```diff
--- a/frontend/src/components/virtualized/virtualized-file-tree/tree-context-menu.tsx
+++ b/frontend/src/components/virtualized/virtualized-file-tree/tree-context-menu.tsx
@@
   const {
     editTags,
     moveToTrash,
     pin,
     rename,
     revealInFinder,
     openInNewWindow,
+    openInNewTab,
   } = useContextMenuItems();
@@
   const revealTarget = filePath ?? folderPath;
   if (revealTarget) {
     rows.push(
+      dropdownItemToMenuRow(openInNewTab({ path: revealTarget })),
       dropdownItemToMenuRow(openInNewWindow({ path: revealTarget })),
       dropdownItemToMenuRow(revealInFinder({ path: revealTarget }))
     );
   }
```

```diff
--- a/frontend/src/components/editor/plugins/link-click.tsx
+++ b/frontend/src/components/editor/plugins/link-click.tsx
@@
       if (isInternalLink(url)) {
-        navigate(url.split(WAILS_URL)[1]);
+        const location = url.split(WAILS_URL)[1];
+        // ⌘-click opens a background tab, like a browser.
+        if (event.metaKey) {
+          setWorkspace((workspace) => openTab(workspace, { location, activate: false }));
+        } else {
+          navigate(location);
+        }
```

In `use-palette-commands.tsx`, add `new-tab`, `close-tab`, `next-tab`, and `previous-tab` commands with the shortcuts ⌘T, ⌘W, ⌃⇥, ⌃⇧⇥. Each one runs `store.set(workspaceAtom, …)` with the matching operation. `close-tab` closes `getFocusedPane(ws).id`, the focused group's active tab.

**Tests**:

- `workspace.test.ts`:
  - `openTab` inserts after the group's active tab.
  - `insertTab` honors an explicit index and `activate: false`.
  - `closeTab` picks the right neighbor, then the left, and the last close yields a fresh workspace.
  - `closeOtherTabs` keeps only the given tab, active.
  - `selectAdjacentTab` wraps within the focused group.
  - `getLocationTitle` handles notes (drops `.md`), PDFs (keeps the extension), folders, kernels, `/`, and `/404`.
- `tabs.spec.ts`:
  1. Open a note, click "New tab", then open another note from the tree. Two tabs are shown, and the URL follows the selected tab.
  2. Type in tab 1, switch to tab 2, and switch back. The text, undo (⌘Z), and scroll position are intact.
  3. Switch away within 150 ms of typing. The save binding was called with the new text.
  4. While tab 1 is hidden, `emitWailsEvent(page, 'file:write', …)` new markdown for its note. Showing tab 1 displays it.
  5. `emitWailsEvent(page, 'tab:new')` (⌘T) while typing in an editor adds an empty "New Tab" right after the active tab and selects it. The previous tab's text is intact.
  6. `emitWailsEvent(page, 'tab:close')` closes the selected tab, and the neighbor becomes selected.
  7. "Open in New Tab" from the tree context menu adds a tab.
  8. With the sidebar hidden, the maximize button is inside the tab bar.

**Verification**:

```bash
cd frontend && bun run e2e:prepare   # regenerates .js bindings for the new events
bun check
cd frontend && bun run test:e2e tabs navigation editor folder-sidebar command-palette
```

Native checks:

- Drag the window from empty tab-bar space and from the sidebar header; double-clicking either zooms. Buttons and tabs don't drag the window.
- ⌘T opens a new tab even while the cursor is in a note or the file tree's search box, and ⌘W and ⌃⇥ work. ⇧⌘W closes the window. Check whether Wails accepts `ctrl+tab`; if it doesn't, use `cmdorctrl+alt+right` / `left`.
- The traffic lights never overlap tabs, whether the sidebar is shown or hidden, and in fullscreen.
- The ⌘S sidebar toggle animates once, not once per open tab.

---

### Commit 4: `feat(tabs): add editor groups with split, move, and resize`

**Rationale**: This adds VS Code's groups on top of working tabs. The layout operations are pure and tested: split, move, close group, resize, and drop-zone hit testing. Rendering, the resize handle, pointer-driven tab dragging, and the "Open to the Side" entry points all build on them. It also replaces the old plan's file-tree-to-edge drops: file-tree drags keep inserting links, and splits come from tabs, menus, and commands.

**Files**:

- Modify: [`frontend/src/utils/workspace.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/workspace.ts), [`workspace.test.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/workspace.test.ts)
- Create: [`frontend/src/components/workspace/split-view.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/split-view.tsx), [`split-resize-handle.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/split-resize-handle.tsx), [`use-tab-drag.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/use-tab-drag.ts), [`tab-drag-overlay.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/tab-drag-overlay.tsx)
- Modify: [`components/workspace/index.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/index.tsx), [`editor-group.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/editor-group.tsx), [`tab-bar.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/workspace/tab-bar.tsx), [`hooks/workspace.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/hooks/workspace.tsx), [`frontend/src/index.css`](file:///Users/etesam/Coding/bytebook/frontend/src/index.css)
- Modify (entry points): [`context-menu/items.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/context-menu/items.tsx), [`virtualized-file-tree/tree-context-menu.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/virtualized/virtualized-file-tree/tree-context-menu.tsx), [`editor/plugins/link-click.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/editor/plugins/link-click.tsx), [`use-palette-commands.tsx`](file:///Users/etesam/Coding/bytebook/frontend/src/components/command-palette/hooks/use-palette-commands.tsx)
- Modify: [`internal/ui/menus/application_menu.go`](file:///Users/etesam/Coding/bytebook/internal/ui/menus/application_menu.go), [`internal/util/events.go`](file:///Users/etesam/Coding/bytebook/internal/util/events.go), [`frontend/src/utils/events.ts`](file:///Users/etesam/Coding/bytebook/frontend/src/utils/events.ts), regenerated `frontend/bindings/`
- Modify: [`frontend/tests/e2e/specs/tabs.spec.ts`](file:///Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/tabs.spec.ts)

**Diffs**:

```diff
--- a/frontend/src/utils/workspace.ts
+++ b/frontend/src/utils/workspace.ts
@@
+export type DropEdge = 'left' | 'right' | 'top' | 'bottom';
+export type DropZone = DropEdge | 'center';
+
+const MIN_SPLIT_FRACTION = 0.15;
+const EDGE_HIT_FRACTION = 0.3;
+
+function sum(values: readonly number[]): number {
+  return values.reduce((total, value) => total + value, 0);
+}
+
+function insertBeside(
+  node: WorkspaceNode,
+  {
+    targetGroupId,
+    inserted,
+    edge,
+  }: { targetGroupId: string; inserted: EditorGroup; edge: DropEdge }
+): WorkspaceNode {
+  if (node.type === 'split') {
+    return {
+      ...node,
+      children: node.children.map((child) =>
+        insertBeside(child, { targetGroupId, inserted, edge })
+      ),
+    };
+  }
+  if (node.id !== targetGroupId) return node;
+  const before = edge === 'left' || edge === 'top';
+  return {
+    type: 'split',
+    id: crypto.randomUUID(),
+    direction: edge === 'left' || edge === 'right' ? 'row' : 'column',
+    children: before ? [inserted, node] : [node, inserted],
+    sizes: [1, 1],
+  };
+}
+
+// Flattens same-direction nesting (keeping each group's share) and unwraps single-child splits.
+function normalizeNode(node: WorkspaceNode): WorkspaceNode {
+  if (node.type === 'group') return node;
+  const children: WorkspaceNode[] = [];
+  const sizes: number[] = [];
+  node.children.forEach((child, i) => {
+    const normalized = normalizeNode(child);
+    const size = node.sizes[i] ?? 1;
+    if (normalized.type === 'split' && normalized.direction === node.direction) {
+      const total = sum(normalized.sizes);
+      normalized.children.forEach((grandchild, j) => {
+        children.push(grandchild);
+        sizes.push((size * normalized.sizes[j]) / total);
+      });
+    } else {
+      children.push(normalized);
+      sizes.push(size);
+    }
+  });
+  return children.length === 1 ? children[0] : { ...node, children, sizes };
+}
+
+function removeGroupNode(node: WorkspaceNode, groupId: string): WorkspaceNode | null {
+  if (node.type === 'group') return node.id === groupId ? null : node;
+  const children: WorkspaceNode[] = [];
+  const sizes: number[] = [];
+  node.children.forEach((child, i) => {
+    const kept = removeGroupNode(child, groupId);
+    if (kept) {
+      children.push(kept);
+      sizes.push(node.sizes[i] ?? 1);
+    }
+  });
+  return children.length === 0 ? null : { ...node, children, sizes };
+}
+
+// The next group in reading order takes focus, like VS Code; the last group leaves an empty workspace.
+export function closeGroup(workspace: Workspace, groupId: string): Workspace {
+  const groups = getGroups(workspace.root);
+  const index = groups.findIndex(({ id }) => id === groupId);
+  if (index === -1) return workspace;
+  const remaining = removeGroupNode(workspace.root, groupId);
+  if (!remaining) return createWorkspace();
+  const focusedGroupId =
+    workspace.focusedGroupId === groupId
+      ? (groups[index + 1] ?? groups[index - 1]).id
+      : workspace.focusedGroupId;
+  return { root: normalizeNode(remaining), focusedGroupId };
+}
+
+/** Puts `pane` in a new group on `edge` of the target group and focuses it. */
+export function splitGroup(
+  workspace: Workspace,
+  {
+    targetGroupId,
+    edge,
+    pane,
+  }: { targetGroupId: string; edge: DropEdge; pane: WorkspacePane }
+): Workspace {
+  if (!findGroup(workspace, targetGroupId)) return workspace;
+  const group = createGroup(pane);
+  return {
+    root: normalizeNode(
+      insertBeside(workspace.root, { targetGroupId, inserted: group, edge })
+    ),
+    focusedGroupId: group.id,
+  };
+}
+
+// ⌘\ and "Split Right/Down": a second editor on the same location in a new group.
+export function splitTab(
+  workspace: Workspace,
+  { paneId, edge }: { paneId: string; edge: DropEdge }
+): Workspace {
+  const group = findGroupOfPane(workspace, paneId);
+  const pane = findPane(workspace, paneId);
+  if (!group || !pane) return workspace;
+  return splitGroup(workspace, {
+    targetGroupId: group.id,
+    edge,
+    pane: createPane(getPaneLocation(pane)),
+  });
+}
+
+// VS Code "Open to the Side": the next group in reading order, or a new group on the right.
+export function openToSide(workspace: Workspace, location: string): Workspace {
+  const groups = getGroups(workspace.root);
+  const index = groups.findIndex(({ id }) => id === workspace.focusedGroupId);
+  const nextGroup = groups[index + 1];
+  const pane = createPane(location);
+  if (!nextGroup) {
+    return splitGroup(workspace, {
+      targetGroupId: workspace.focusedGroupId,
+      edge: 'right',
+      pane,
+    });
+  }
+  return activateTab(insertTab(workspace, { pane, groupId: nextGroup.id }), pane.id);
+}
+
+/**
+ * Moves a tab to `index` in a group's strip (the current order, 0..tabs.length),
+ * or after the active tab when `index` is omitted. An emptied source group closes.
+ */
+export function moveTab(
+  workspace: Workspace,
+  { paneId, toGroupId, index }: { paneId: string; toGroupId: string; index?: number }
+): Workspace {
+  const source = findGroupOfPane(workspace, paneId);
+  const pane = findPane(workspace, paneId);
+  if (!source || !pane || !findGroup(workspace, toGroupId)) return workspace;
+  if (source.id === toGroupId) {
+    const from = source.tabs.findIndex(({ id }) => id === paneId);
+    const to = index === undefined ? from : index > from ? index - 1 : index;
+    if (from === to) return activateTab(workspace, paneId);
+    const tabs = [...source.tabs];
+    tabs.splice(from, 1);
+    tabs.splice(to, 0, pane);
+    return activateTab(
+      mapGroups(workspace, (g) => (g.id === source.id ? { ...g, tabs } : g)),
+      paneId
+    );
+  }
+  const withoutTab = closeTab(workspace, paneId);
+  return activateTab(
+    insertTab(withoutTab, { pane, groupId: toGroupId, index }),
+    paneId
+  );
+}
+
+export function moveTabToNewGroup(
+  workspace: Workspace,
+  {
+    paneId,
+    targetGroupId,
+    edge,
+  }: { paneId: string; targetGroupId: string; edge: DropEdge }
+): Workspace {
+  const source = findGroupOfPane(workspace, paneId);
+  const pane = findPane(workspace, paneId);
+  if (!source || !pane) return workspace;
+  // A group can't be split off its own only tab.
+  if (source.id === targetGroupId && source.tabs.length === 1) return workspace;
+  return splitGroup(closeTab(workspace, paneId), { targetGroupId, edge, pane });
+}
+
+export function focusAdjacentGroup(workspace: Workspace, delta: -1 | 1): Workspace {
+  const groups = getGroups(workspace.root);
+  const index = groups.findIndex(({ id }) => id === workspace.focusedGroupId);
+  const next = groups[(index + delta + groups.length) % groups.length];
+  return focusPane(workspace, getActivePane(next).id);
+}
+
+/** Groups whose tab bars sit under the title bar and drag the window. */
+export function getTopRowGroupIds(node: WorkspaceNode): string[] {
+  if (node.type === 'group') return [node.id];
+  return node.direction === 'row'
+    ? node.children.flatMap(getTopRowGroupIds)
+    : getTopRowGroupIds(node.children[0]);
+}
+
+export function resizeSplit(
+  workspace: Workspace,
+  { splitId, sizes }: { splitId: string; sizes: number[] }
+): Workspace {
+  const resizeNode = (node: WorkspaceNode): WorkspaceNode =>
+    node.type === 'group'
+      ? node
+      : node.id === splitId
+        ? { ...node, sizes }
+        : { ...node, children: node.children.map(resizeNode) };
+  return { ...workspace, root: resizeNode(workspace.root) };
+}
+
+// Moves the boundary before `index`, keeping both neighbors at or above the minimum share.
+export function resizeAdjacent({
+  sizes,
+  index,
+  deltaFraction,
+}: {
+  sizes: readonly number[];
+  index: number;
+  deltaFraction: number;
+}): number[] {
+  const total = sum(sizes);
+  const min = MIN_SPLIT_FRACTION * total;
+  const pair = sizes[index - 1] + sizes[index];
+  if (pair <= 2 * min) return [...sizes];
+  const before = Math.min(Math.max(sizes[index - 1] + deltaFraction * total, min), pair - min);
+  return sizes.map((size, i) =>
+    i === index - 1 ? before : i === index ? pair - before : size
+  );
+}
+
+type Rect = { left: number; top: number; width: number; height: number };
+
+// VS Code's five zones: the nearest edge within EDGE_HIT_FRACTION, else the center.
+export function getDropZone({ rect, x, y }: { rect: Rect; x: number; y: number }): DropZone | null {
+  if (rect.width === 0 || rect.height === 0) return null;
+  const fx = (x - rect.left) / rect.width;
+  const fy = (y - rect.top) / rect.height;
+  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
+  const candidates: [DropEdge, number][] = [
+    ['left', fx],
+    ['right', 1 - fx],
+    ['top', fy],
+    ['bottom', 1 - fy],
+  ];
+  const [edge, distance] = candidates.reduce((best, next) => (next[1] < best[1] ? next : best));
+  return distance <= EDGE_HIT_FRACTION ? edge : 'center';
+}
+
+export function getZonePreviewRect({ rect, zone }: { rect: Rect; zone: DropZone }): Rect {
+  const halfWidth = rect.width / 2;
+  const halfHeight = rect.height / 2;
+  if (zone === 'left') return { ...rect, width: halfWidth };
+  if (zone === 'right') return { ...rect, left: rect.left + halfWidth, width: halfWidth };
+  if (zone === 'top') return { ...rect, height: halfHeight };
+  if (zone === 'bottom') return { ...rect, top: rect.top + halfHeight, height: halfHeight };
+  return rect;
+}
+
+export type SplitHandle = {
+  split: WorkspaceSplit;
+  // Boundary before children[index].
+  index: number;
+  // Fractions of the workspace area.
+  container: Rect;
+  offset: number;
+};
+
+/**
+ * Fractional rects for every group plus the resize handles between siblings.
+ * Groups render as one flat keyed list, so changing the layout never remounts
+ * a group's editors. `preview` overrides one split's sizes during a resize drag.
+ */
+export function computeLayout(
+  root: WorkspaceNode,
+  preview: { splitId: string; sizes: number[] } | null = null
+): { groupRects: Map<string, Rect>; handles: SplitHandle[] } {
+  const groupRects = new Map<string, Rect>();
+  const handles: SplitHandle[] = [];
+  const walk = (node: WorkspaceNode, rect: Rect) => {
+    if (node.type === 'group') {
+      groupRects.set(node.id, rect);
+      return;
+    }
+    const sizes = preview?.splitId === node.id ? preview.sizes : node.sizes;
+    const total = sum(sizes);
+    let offset = 0;
+    node.children.forEach((child, index) => {
+      const fraction = sizes[index] / total;
+      if (index > 0) handles.push({ split: node, index, container: rect, offset });
+      walk(
+        child,
+        node.direction === 'row'
+          ? { ...rect, left: rect.left + offset * rect.width, width: fraction * rect.width }
+          : { ...rect, top: rect.top + offset * rect.height, height: fraction * rect.height }
+      );
+      offset += fraction;
+    });
+  };
+  walk(root, { left: 0, top: 0, width: 1, height: 1 });
+  return { groupRects, handles };
+}
+
+export function getTabInsertIndex({ tabRects, x }: { tabRects: readonly Rect[]; x: number }): number {
+  const index = tabRects.findIndex((rect) => x < rect.left + rect.width / 2);
+  return index === -1 ? tabRects.length : index;
+}
@@ export function closeTab(workspace: Workspace, paneId: string): Workspace {
   const tabs = group.tabs.filter(({ id }) => id !== paneId);
-  if (tabs.length === 0) return createWorkspace();
+  if (tabs.length === 0) return closeGroup(workspace, group.id);
```

Rendering the layout:

```diff
--- /dev/null
+++ b/frontend/src/components/workspace/split-view.tsx
@@ -0,0 +1,60 @@
+import { useRef, type CSSProperties } from 'react';
+import { useAtomValue } from 'jotai';
+import type { LegacyAnimationControls } from 'motion/react';
+import {
+  computeLayout,
+  getGroups,
+  getTopRowGroupIds,
+  type Workspace,
+} from '@utils/workspace';
+import { EditorGroupView } from './editor-group';
+import { SplitResizeHandle, splitResizePreviewAtom } from './split-resize-handle';
+
+function toPercentStyle(rect: {
+  left: number;
+  top: number;
+  width: number;
+  height: number;
+}): CSSProperties {
+  return {
+    left: `${rect.left * 100}%`,
+    top: `${rect.top * 100}%`,
+    width: `${rect.width * 100}%`,
+    height: `${rect.height * 100}%`,
+  };
+}
+
+export function WorkspaceLayout({
+  workspace,
+  animationControls,
+}: {
+  workspace: Workspace;
+  animationControls: LegacyAnimationControls;
+}) {
+  const containerRef = useRef<HTMLDivElement>(null);
+  const preview = useAtomValue(splitResizePreviewAtom);
+  const { groupRects, handles } = computeLayout(workspace.root, preview);
+  const groups = getGroups(workspace.root);
+  const topRowGroupIds = getTopRowGroupIds(workspace.root);
+
+  return (
+    <div ref={containerRef} className="relative h-full min-w-0 flex-1">
+      {/* Flat and keyed by id: a group keeps its editors when the tree around it changes. */}
+      {groups.map((group) => (
+        <div
+          key={group.id}
+          className="absolute flex min-h-0 min-w-0"
+          style={toPercentStyle(groupRects.get(group.id)!)}
+        >
+          <EditorGroupView
+            group={group}
+            isTopLeft={group.id === groups[0].id}
+            isTopRow={topRowGroupIds.includes(group.id)}
+            animationControls={animationControls}
+          />
+        </div>
+      ))}
+      {handles.map((handle) => (
+        <SplitResizeHandle
+          key={`${handle.split.id}:${handle.index}`}
+          handle={handle}
+          containerRef={containerRef}
+        />
+      ))}
+    </div>
+  );
+}
```

```diff
--- /dev/null
+++ b/frontend/src/components/workspace/split-resize-handle.tsx
@@ -0,0 +1,100 @@
+import { type RefObject, useRef } from 'react';
+import { atom, useAtomValue, useSetAtom } from 'jotai';
+import { useMove } from 'react-aria';
+import { workspaceAtom } from '@/atoms';
+import { cn } from '@utils/string-formatting';
+import { resizeAdjacent, resizeSplit, type SplitHandle } from '@utils/workspace';
+
+const KEYBOARD_STEP_FRACTION = 0.02;
+
+// Live sizes while dragging; committed to the workspace (and localStorage) on release.
+export const splitResizePreviewAtom = atom<{ splitId: string; sizes: number[] } | null>(null);
+
+// Same approach as the sidebar's PanelResizeHandle, along either axis.
+export function SplitResizeHandle({
+  handle,
+  containerRef,
+}: {
+  handle: SplitHandle;
+  containerRef: RefObject<HTMLDivElement | null>;
+}) {
+  const { split, index, container, offset } = handle;
+  const setWorkspace = useSetAtom(workspaceAtom);
+  const preview = useAtomValue(splitResizePreviewAtom);
+  const setPreview = useSetAtom(splitResizePreviewAtom);
+  const isRow = split.direction === 'row';
+  const isDragging = preview?.splitId === split.id;
+  const cursorClass = isRow ? 'bb-force-col-resize' : 'bb-force-row-resize';
+  const moveStateRef = useRef<{ pixels: number; delta: number; sizes: number[] } | null>(null);
+
+  const { moveProps } = useMove({
+    onMoveStart: () => {
+      const element = containerRef.current;
+      if (!element) return;
+      document.body.classList.add(cursorClass);
+      moveStateRef.current = {
+        pixels: isRow
+          ? element.clientWidth * container.width
+          : element.clientHeight * container.height,
+        delta: 0,
+        sizes: split.sizes,
+      };
+    },
+    onMove: (e) => {
+      const state = moveStateRef.current;
+      if (!state) return;
+      const step = isRow ? e.deltaX : e.deltaY;
+      state.delta +=
+        e.pointerType === 'keyboard'
+          ? Math.sign(step) * KEYBOARD_STEP_FRACTION * state.pixels
+          : step;
+      state.sizes = resizeAdjacent({
+        sizes: split.sizes,
+        index,
+        deltaFraction: state.delta / state.pixels,
+      });
+      setPreview({ splitId: split.id, sizes: state.sizes });
+    },
+    onMoveEnd: () => {
+      const state = moveStateRef.current;
+      if (!state) return;
+      moveStateRef.current = null;
+      document.body.classList.remove(cursorClass);
+      setPreview(null);
+      setWorkspace((workspace) =>
+        resizeSplit(workspace, { splitId: split.id, sizes: state.sizes })
+      );
+    },
+  });
+
+  const sizes = preview?.splitId === split.id ? preview.sizes : split.sizes;
+  const share = sizes[index - 1] / (sizes[index - 1] + sizes[index]);
+  const position = isRow
+    ? {
+        left: `${(container.left + offset * container.width) * 100}%`,
+        top: `${container.top * 100}%`,
+        height: `${container.height * 100}%`,
+      }
+    : {
+        top: `${(container.top + offset * container.height) * 100}%`,
+        left: `${container.left * 100}%`,
+        width: `${container.width * 100}%`,
+      };
+
+  return (
+    <div
+      {...moveProps}
+      role="separator"
+      aria-orientation={isRow ? 'vertical' : 'horizontal'}
+      aria-label="Resize editor groups"
+      aria-valuenow={Math.round(share * 100)}
+      tabIndex={0}
+      style={position}
+      onDoubleClick={() =>
+        setWorkspace((workspace) =>
+          resizeSplit(workspace, { splitId: split.id, sizes: split.sizes.map(() => 1) })
+        )
+      }
+      className={cn(
+        'absolute z-10 outline-none before:absolute before:bg-zinc-200 hover:before:bg-(--accent-color) focus-visible:before:bg-(--accent-color) dark:before:bg-zinc-700',
+        isRow
+          ? 'w-2 -translate-x-1/2 cursor-col-resize before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 hover:before:w-[3px]'
+          : 'h-2 -translate-y-1/2 cursor-row-resize before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2 hover:before:h-[3px]',
+        isDragging && 'before:bg-(--accent-color)'
+      )}
+    />
+  );
+}
```

(Resizing re-renders the layout per pointer move, but each `EditorGroupView` gets the same props, so the React Compiler skips re-rendering the editors; only the wrapper styles change. If profiling shows otherwise, switch to direct DOM writes on the wrappers, as `PanelResizeHandle` does.)

```diff
--- a/frontend/src/index.css
+++ b/frontend/src/index.css
@@
   .bb-force-row-resize,
   .bb-force-row-resize * {
     cursor: row-resize !important;
   }
+  .bb-force-col-resize,
+  .bb-force-col-resize * {
+    cursor: col-resize !important;
+  }
+  .bb-force-grabbing,
+  .bb-force-grabbing * {
+    cursor: grabbing !important;
+  }
```

```diff
--- a/frontend/src/components/workspace/index.tsx
+++ b/frontend/src/components/workspace/index.tsx
@@
-import { EditorGroupView } from './editor-group';
+import { WorkspaceLayout } from './split-view';
+import { TabDragOverlay } from './tab-drag-overlay';
@@ export function Workspace() {
-  const { root } = useAtomValue(workspaceAtom);
+  const workspace = useAtomValue(workspaceAtom);
@@
     <motion.div animate={animationControls} className="flex h-full min-w-0">
-      {/* One group until commit 4 renders the split tree. */}
-      {root.type === 'group' && (
-        <EditorGroupView
-          group={root}
-          isTopLeft
-          isTopRow
-          animationControls={animationControls}
-        />
-      )}
+      <WorkspaceLayout workspace={workspace} animationControls={animationControls} />
+      <TabDragOverlay />
     </motion.div>
```


Tab dragging:

```diff
--- /dev/null
+++ b/frontend/src/components/workspace/use-tab-drag.ts
@@ -0,0 +1,125 @@
+import { atom, useSetAtom, useStore } from 'jotai';
+import type { PointerEvent as ReactPointerEvent } from 'react';
+import { workspaceAtom } from '@/atoms';
+import { isPointInsideElement } from '@components/folder-renderer/drop';
+import {
+  findGroupOfPane,
+  getDropZone,
+  getTabInsertIndex,
+  moveTab,
+  moveTabToNewGroup,
+  type DropZone,
+} from '@utils/workspace';
+
+const DRAG_THRESHOLD_PX = 4;
+
+export type TabDropTarget =
+  | { type: 'tab-list'; groupId: string; index: number; indicator: DOMRect }
+  | { type: 'group'; groupId: string; zone: DropZone; groupRect: DOMRect };
+
+export const tabDragAtom = atom<{
+  paneId: string;
+  x: number;
+  y: number;
+  target: TabDropTarget | null;
+} | null>(null);
+
+function getTabDropTarget({
+  sourceGroupId,
+  sourceTabCount,
+  x,
+  y,
+}: {
+  sourceGroupId: string;
+  sourceTabCount: number;
+  x: number;
+  y: number;
+}): TabDropTarget | null {
+  for (const list of document.querySelectorAll<HTMLElement>('[data-group-tab-list]')) {
+    if (!isPointInsideElement({ element: list, x, y })) continue;
+    const tabRects = [...list.querySelectorAll<HTMLElement>('[data-tab-id]')].map((tab) =>
+      tab.getBoundingClientRect()
+    );
+    const index = getTabInsertIndex({ tabRects, x });
+    const listRect = list.getBoundingClientRect();
+    const edgeX =
+      index < tabRects.length ? tabRects[index].left : (tabRects.at(-1)?.right ?? listRect.left);
+    return {
+      type: 'tab-list',
+      groupId: list.dataset.groupTabList!,
+      index,
+      indicator: new DOMRect(edgeX - 1, listRect.top, 2, listRect.height),
+    };
+  }
+  for (const body of document.querySelectorAll<HTMLElement>('[data-group-body]')) {
+    const groupRect = body.getBoundingClientRect();
+    const zone = getDropZone({ rect: groupRect, x, y });
+    if (!zone) continue;
+    const groupId = body.dataset.groupBody!;
+    // Its own group's center is a no-op, and a lone tab can't split its own group.
+    if (groupId === sourceGroupId && (zone === 'center' || sourceTabCount === 1)) {
+      return null;
+    }
+    return { type: 'group', groupId, zone, groupRect };
+  }
+  return null;
+}
+
+// Pointer-driven, not HTML5 drag and drop, so the editor's drop handlers never see tab drags.
+export function useTabDrag(paneId: string) {
+  const store = useStore();
+  const setTabDrag = useSetAtom(tabDragAtom);
+  const setWorkspace = useSetAtom(workspaceAtom);
+
+  function onPointerDown(e: ReactPointerEvent) {
+    if (e.button !== 0) return;
+    const source = findGroupOfPane(store.get(workspaceAtom), paneId);
+    if (!source) return;
+    const startX = e.clientX;
+    const startY = e.clientY;
+    let isDragging = false;
+
+    const stop = () => {
+      window.removeEventListener('pointermove', onMove);
+      window.removeEventListener('pointerup', onUp);
+      window.removeEventListener('pointercancel', stop);
+      window.removeEventListener('keydown', onKeyDown, true);
+      document.body.classList.remove('bb-force-grabbing');
+      setTabDrag(null);
+    };
+    const onMove = (event: PointerEvent) => {
+      if (!isDragging && Math.hypot(event.clientX - startX, event.clientY - startY) < DRAG_THRESHOLD_PX) return;
+      if (!isDragging) document.body.classList.add('bb-force-grabbing');
+      isDragging = true;
+      setTabDrag({
+        paneId,
+        x: event.clientX,
+        y: event.clientY,
+        target: getTabDropTarget({
+          sourceGroupId: source.id,
+          sourceTabCount: source.tabs.length,
+          x: event.clientX,
+          y: event.clientY,
+        }),
+      });
+    };
+    const onUp = () => {
+      const target = store.get(tabDragAtom)?.target;
+      stop();
+      if (!isDragging || !target) return;
+      setWorkspace((workspace) => {
+        if (target.type === 'tab-list') {
+          return moveTab(workspace, { paneId, toGroupId: target.groupId, index: target.index });
+        }
+        return target.zone === 'center'
+          ? moveTab(workspace, { paneId, toGroupId: target.groupId })
+          : moveTabToNewGroup(workspace, { paneId, targetGroupId: target.groupId, edge: target.zone });
+      });
+    };
+    const onKeyDown = (event: KeyboardEvent) => {
+      if (event.key !== 'Escape') return;
+      event.stopPropagation();
+      stop();
+    };
+
+    window.addEventListener('pointermove', onMove);
+    window.addEventListener('pointerup', onUp);
+    window.addEventListener('pointercancel', stop);
+    window.addEventListener('keydown', onKeyDown, true);
+  }
+
+  return { onPointerDown };
+}
```

(If `isPointInsideElement` should stay private to the folder renderer, move it to `utils/general.ts` in this commit and update both imports. Check that RAC's `Tab` doesn't select the tab on a pointerup that ends a drag in another group. If it does, stop propagation of that pointerup while `isDragging`.)

```diff
--- /dev/null
+++ b/frontend/src/components/workspace/tab-drag-overlay.tsx
@@ -0,0 +1,45 @@
+import { useAtomValue } from 'jotai';
+import { workspaceAtom } from '@/atoms';
+import { findPane, getPaneTitle, getZonePreviewRect } from '@utils/workspace';
+import { tabDragAtom } from './use-tab-drag';
+
+export function TabDragOverlay() {
+  const drag = useAtomValue(tabDragAtom);
+  const workspace = useAtomValue(workspaceAtom);
+  if (!drag) return null;
+  const pane = findPane(workspace, drag.paneId);
+  const target = drag.target;
+  const preview =
+    target?.type === 'group'
+      ? getZonePreviewRect({ rect: target.groupRect, zone: target.zone })
+      : target?.indicator;
+
+  return (
+    <div className="pointer-events-none fixed inset-0 z-50">
+      {preview && (
+        <div
+          className={
+            target?.type === 'group'
+              ? 'absolute rounded-md border-2 border-(--accent-color) bg-(--accent-color)/15 transition-all duration-100'
+              : 'absolute bg-(--accent-color)'
+          }
+          style={{ left: preview.left, top: preview.top, width: preview.width, height: preview.height }}
+        />
+      )}
+      {pane && (
+        <div
+          className="absolute max-w-52 truncate rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-sm shadow-md dark:border-zinc-600 dark:bg-zinc-800"
+          style={{ left: drag.x + 8, top: drag.y + 8 }}
+        >
+          {getPaneTitle(pane)}
+        </div>
+      )}
+    </div>
+  );
+}
```

```diff
--- a/frontend/src/components/workspace/editor-group.tsx
+++ b/frontend/src/components/workspace/editor-group.tsx
@@
-      <TabPanels items={group.tabs} className="flex min-h-0 min-w-0 flex-1">
+      <TabPanels
+        items={group.tabs}
+        // Tab-drag hit target for the five drop zones.
+        data-group-body={group.id}
+        className="flex min-h-0 min-w-0 flex-1"
+      >
```

```diff
--- a/frontend/src/components/workspace/tab-bar.tsx
+++ b/frontend/src/components/workspace/tab-bar.tsx
@@
+import { SplitDown } from '@/icons/split-down';
+import { SplitRight } from '@/icons/split-right';
+import { useTabDrag } from './use-tab-drag';
@@ function WorkspaceTabItem({
   const setWorkspace = useSetAtom(workspaceAtom);
   const setContextMenuData = useSetAtom(contextMenuDataAtom);
+  const { onPointerDown } = useTabDrag(pane.id);
   const close = () => setWorkspace((prev) => closeTab(prev, pane.id));
@@
     <Tab
       id={pane.id}
       data-tab-id={pane.id}
+      onPointerDown={onPointerDown}
@@ (context menu items, after close-other-tabs)
+            {
+              value: 'split-right',
+              label: <MenuItemLabel icon={<SplitRight />}>Split Right</MenuItemLabel>,
+              onChange: () => setWorkspace((prev) => splitTab(prev, { paneId: pane.id, edge: 'right' })),
+            },
+            {
+              value: 'split-down',
+              label: <MenuItemLabel icon={<SplitDown />}>Split Down</MenuItemLabel>,
+              onChange: () => setWorkspace((prev) => splitTab(prev, { paneId: pane.id, edge: 'bottom' })),
+            },
```

(`SplitRight` and `SplitDown` are new icons in `frontend/src/icons/`, copied from `xmark.tsx`'s structure: a rectangle with a vertical or horizontal divider.)

⌘\ splits the focused tab, as in VS Code:

```diff
--- a/internal/util/events.go
+++ b/internal/util/events.go
@@
 	EventTabPrevious         = "tab:previous"
+	EventGroupSplitRight     = "group:split-right"
@@
 	application.RegisterEvent[application.Void](EventTabPrevious)
+	application.RegisterEvent[application.Void](EventGroupSplitRight)
```

```diff
--- a/internal/ui/menus/application_menu.go
+++ b/internal/ui/menus/application_menu.go
@@ func configureFileMenu(app *application.App, menu *application.Menu, bg application.RGBA, createWindow WindowCreator) {
 	addTabItem(app, sub, "Show Previous Tab", "ctrl+shift+tab", util.EventTabPrevious)
+	addTabItem(app, sub, "Split Editor Right", "cmdorctrl+backslash", util.EventGroupSplitRight)
```

(Check the accelerator name Wails' parser uses for `\`; `backslash` is a guess. If it doesn't parse, look at the key table in the fork's `pkg/application/keys.go`.)

```diff
--- a/frontend/src/utils/events.ts
+++ b/frontend/src/utils/events.ts
@@
 export const TAB_PREVIOUS = 'tab:previous';
+export const GROUP_SPLIT_RIGHT = 'group:split-right';
```

```diff
--- a/frontend/src/hooks/workspace.tsx
+++ b/frontend/src/hooks/workspace.tsx
@@ export function useTabCommandEvents(): void {
+  useWailsEvent(GROUP_SPLIT_RIGHT, (event) =>
+    updateIfCurrentWindow(event, (ws) =>
+      splitTab(ws, { paneId: getFocusedPane(ws).id, edge: 'right' })
+    )
+  );
 }
```

`TAB_CLOSE` needs no change: `closeTab` now closes an emptied group.

Entry points for "Open to the Side":

```diff
--- a/frontend/src/components/context-menu/items.tsx
+++ b/frontend/src/components/context-menu/items.tsx
@@ export function useContextMenuItems() {
+    openToSide: ({ path }: { path: FileOrFolderPath }): DropdownItem => ({
+      value: 'open-to-side',
+      label: (
+        <MenuItemLabel icon={<SplitRight {...ICON_PROPS} />}>Open to the Side</MenuItemLabel>
+      ),
+      onChange: () =>
+        setWorkspace((workspace) =>
+          openToSide(
+            workspace,
+            path.type === 'folder' ? path.encodedFolderUrl : path.encodedFileUrl
+          )
+        ),
+    }),
```

```diff
--- a/frontend/src/components/virtualized/virtualized-file-tree/tree-context-menu.tsx
+++ b/frontend/src/components/virtualized/virtualized-file-tree/tree-context-menu.tsx
@@
     openInNewWindow,
     openInNewTab,
+    openToSide,
   } = useContextMenuItems();
@@
     rows.push(
       dropdownItemToMenuRow(openInNewTab({ path: revealTarget })),
+      dropdownItemToMenuRow(openToSide({ path: revealTarget })),
       dropdownItemToMenuRow(openInNewWindow({ path: revealTarget })),
       dropdownItemToMenuRow(revealInFinder({ path: revealTarget }))
     );
```

```diff
--- a/frontend/src/components/editor/plugins/link-click.tsx
+++ b/frontend/src/components/editor/plugins/link-click.tsx
@@
-        // ⌘-click opens a background tab, like a browser.
-        if (event.metaKey) {
+        // ⌘-click opens a background tab; ⌥-click opens to the side, like VS Code.
+        if (event.altKey) {
+          setWorkspace((workspace) => openToSide(workspace, location));
+        } else if (event.metaKey) {
           setWorkspace((workspace) => openTab(workspace, { location, activate: false }));
         } else {
```

In `use-palette-commands.tsx`, add these commands. Each one runs `store.set(workspaceAtom, …)` with the matching operation:

| id | Label | Shortcut | Operation |
| --- | --- | --- | --- |
| `split-editor-right` | Split Editor Right | ⌘\ | `splitTab(ws, { paneId: getFocusedPane(ws).id, edge: 'right' })` |
| `split-editor-down` | Split Editor Down | | `splitTab(ws, { paneId: getFocusedPane(ws).id, edge: 'bottom' })` |
| `close-group` | Close Editor Group | | `closeGroup(ws, ws.focusedGroupId)` |
| `focus-next-group` | Focus Next Editor Group | | `focusAdjacentGroup(ws, 1)` |
| `focus-previous-group` | Focus Previous Editor Group | | `focusAdjacentGroup(ws, -1)` |
| `move-tab-to-next-group` | Move Tab to Next Group | | `moveTab` into the next group in reading order; if there isn't one, `moveTabToNewGroup` with `edge: 'right'` |

**Tests**:

- `workspace.test.ts`:
  - `splitGroup`: each edge produces the right direction and order; A|B, then splitting B right gives A|B|C with A's share preserved (same-direction flattening); cross-direction splits nest; the new group is focused.
  - `closeGroup`: collapses a single-child split, moves focus to the next group (or the previous one at the end), and closing the last group yields a fresh workspace.
  - `closeTab` closes an emptied group but keeps the only group.
  - `moveTab`: reorders within a group (forward, backward, in place); moves across groups at an index and with the default index; an emptied source group closes; the moved tab is active and its group focused.
  - `moveTabToNewGroup` splits off the target's edge, and is a no-op for a lone tab onto its own group.
  - `splitTab` duplicates the location into a new pane id.
  - `openToSide` uses the next group when one exists, and otherwise splits right.
  - `focusAdjacentGroup` wraps.
  - `getTopRowGroupIds` covers a row, a column, and a column inside a row.
  - `computeLayout`: rects tile the unit square for nested splits, handle offsets match the sizes, and `preview` overrides only its split.
  - `resizeAdjacent` clamps at 15% and returns sizes unchanged when the pair is too small.
  - `getDropZone` returns `center` in the middle, null outside the rect or for a zero rect, and each edge within 30%.
  - `getTabInsertIndex` handles the start, middle, and end.
- `tabs.spec.ts` (Playwright `page.mouse`):
  1. `emitWailsEvent(page, 'group:split-right')` opens the same note in a second group, and both editors are visible.
  2. Drag a tab onto the right edge of the other group. A third group appears to its right.
  3. Drag a tab into another group's tab strip. It moves there, and its old group closes if that emptied it.
  4. Drag a tab onto the center of another group. It moves into that group.
  5. Escape mid-drag. Nothing changes.
  6. Drag the separator. The sizes persist after a reload with `?restore`.
  7. With two groups, `emitWailsEvent(page, 'tab:close')` on a group's only tab closes that group.
  8. Open the same note in both groups and type in one. The other shows the text after the save echo.
  9. "Open to the Side" from the tree context menu opens the note in the group on the right, creating one if needed.
  10. Drag a note from the file tree into an editor. A link is inserted and no group is created (regression guard).
  11. Split right, then type in the original group. Its undo history survives the split (no remount).

**Verification**:

```bash
cd frontend && bun run e2e:prepare   # regenerates .js bindings for the new event
bun check
cd frontend && bun run test:e2e tabs editor drag-ghost folder-sidebar
```

Native checks:

- Split left, right, top, and bottom by dragging tabs; the preview matches the result. Center drops move the tab.
- Tabs never start a window drag. Only the top row's empty tab-bar space drags the window.
- Resize with the mouse and with the arrow keys on a focused separator; double-click resets to equal sizes.
- ⌘T, ⌘F, ⌘W, and ⌘\ act on the focused group. Clicking a note in the tree opens it in the focused group.
- With the sidebar hidden, only the top-left group's tab bar has the maximize button and the traffic-light padding.
- Dropping OS files from Finder into a note in a second group inserts them there only.
- The red "0" drag badge doesn't appear during tab drags (they're pointer-driven) or file-tree drags (Wails fork fix).

---

## Execution notes

- Commit 1 is the riskiest for regressions (saving and loading). Run the full editor e2e suite, not just the listed specs, before moving on.
- If `<Activity>` causes problems in a specific plugin, for example a third-party effect that doesn't tolerate cleanup and re-run, fall back to unmounting inactive tabs in commit 3. `SavePlugin`'s flush-on-cleanup and the refetch-on-show logic already cover that path; only undo history and scroll position would be lost.
- `computeLayout`'s flat rendering is what keeps editors mounted across splits. Don't reintroduce nested flex containers for groups.
- Pre-existing e2e failures (fixtures missing `GetAllPaths`) are documented in the Quick Open plan; compare against that list rather than expecting a fully green run.
