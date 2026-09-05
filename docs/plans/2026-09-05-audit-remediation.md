# Bytebook audit remediation plan

Date: 2026-09-05. Status: planned; no application fixes implemented.

## Goal and agreed decisions

Address **both audit reports in full**: correctness bugs, targeted simplifications, and quality-runner fixes. This is an execution handoff with atomic commits, concrete implementation excerpts, affected files, and regression gates. Diffs describe the intended edits against the inspected checkout; apply them to the current code rather than treating excerpts as standalone patch files.

- Use **Jujutsu**, overriding the skill's generic Git staging examples. Implement, verify, and commit **one entry at a time**, then report its change/commit ID and the next entry. Do not batch implementation across entries.
- Preserve all pre-existing user changes, including the observed unrelated change in [note-title.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/editor/note-title.tsx). Do not include it in any planned commit. Inspect `jj status` and `jj diff` before execution; use path-scoped commits or a separate `jj workspace` if necessary. Do not revert the user's edits.
- Preserve existing metadata. Automatically migrate only unambiguous legacy sidecars; retain ambiguous originals without assigning ownership. No sidecar data is silently discarded.
- Keep current product behavior unless a finding requires a change: 150 ms Markdown autosave, three kernels per language, native file watching, and existing search semantics. The plan does not add public settings for internal recovery mechanisms.
- Scope follows the ranked findings in the two delivered reports; speculative internal audit candidates are not additional implementation requirements.
- Existing passing checks do not establish correctness of the reported edge cases. Before each bug fix, add its focused regression and confirm it fails against the old behavior; then implement and verify. Concurrency tests use barriers/fake transports rather than sleeps.

## Execution and verification contract

All commands below run from `/Users/etesam/Coding/bytebook` unless a command changes directory explicitly. Follow `.agents/rules/` for touched paths. Use real `t.TempDir()` for filesystem, Bleve, and fsnotify tests. Use the existing mocked-Wails Playwright harness for React/Lexical/routing behavior.

After each entry's focused command, run the appropriate complete gate:

```sh
bun check:be   # commits touching Go
bun check:fe   # commits touching frontend
bun check     # commits crossing the boundary
```

For exported service/event changes, run `bun --cwd frontend run e2e:prepare`, review regenerated JavaScript bindings/model/event files, and include them in that same commit. Regeneration must not use `-ts` because the mock harness reads JavaScript method IDs.

Only after the focused and layer checks pass, inspect `jj diff` and make a path-scoped `jj commit -m '<entry title>' <only this entry's files>`. Report the resulting ID, verification, and next entry. Do not silently bypass unrelated failures; isolate and explain them. No push, merge, or release is included.

The audit baseline passed `bun check:fe` and `bun check:be`. Additional `go test -race ./internal/kernel_manager ./internal/lsp ./internal/notes/sidecar` exposed `TestInstanceDidChangeOpensDocOnce` asserting notification receipt too early. The first entry fixes that test synchronization before later race-test gates.

## Ordered commit sequence

### Commit 1: `test(lsp): wait for document notifications before asserting`

**Rationale:** The existing fake server receives notifications asynchronously. Its immediate counter assertion flakes under the race detector and would undermine later concurrency verification.

**Files:** Modify [instance_test.go](/Users/etesam/Coding/bytebook/internal/lsp/instance_test.go).

Add a buffered notification channel to `fakeServer`, initialize it in the fixture, and publish after updating `didChangeCount`. The test consumes two notifications under its existing deadline before reading the counter. Do not hold `fake.mu` while waiting; production transport behavior stays unchanged.

```diff
 type fakeServer struct {
+    didChangeReceived chan struct{}
@@
 case protocol.MethodTextDocumentDidChange:
     s.mu.Lock()
     s.didChangeCount++
     s.mu.Unlock()
+    s.didChangeReceived <- struct{}{}
@@
-    fake.mu.Lock()
+    for range 2 {
+        select {
+        case <-fake.didChangeReceived:
+        case <-ctx.Done():
+            t.Fatal("timed out waiting for both didChange notifications")
+        }
+    }
+    fake.mu.Lock()
```

Initialize the fixture with `fake := &fakeServer{initialized: make(chan struct{}), didChangeReceived: make(chan struct{}, 64)}`. Use a capacity large enough for every fixture test (64); notification publication in tests that do not inspect it must not block the fake server. Assert `didOpen` preceded the two notifications as part of the later LSP ordering entry, not through timing assumptions here.

**Verify:** `go test -race ./internal/lsp -run '^TestInstanceDidChangeOpensDocOnce$' -count=20`, then `go test -race ./internal/lsp`. Expected: stable receipt of exactly two changes and no race reports.

### Commit 2: `fix(checks): enforce analyzer findings and validate after fixes`

**Rationale:** Go deadcode findings currently exit zero and disappear from the runner; `--fix` concurrently writes and validates the same files. Make the existing quality gate truthful and deterministic.

**Files:** Modify [check.ts](/Users/etesam/Coding/bytebook/scripts/check.ts), [package.json](/Users/etesam/Coding/bytebook/package.json), [virtualdoc.go](/Users/etesam/Coding/bytebook/internal/lsp/virtualdoc.go), [virtualdoc_test.go](/Users/etesam/Coding/bytebook/internal/lsp/virtualdoc_test.go). Create [check.test.ts](/Users/etesam/Coding/bytebook/scripts/check.test.ts).

Move the complete existing `VirtualDoc.blockCount` method unchanged into `virtualdoc_test.go`: it is used only by tests, so this is a test-helper relocation, not removal of a required API. Add a task-level output policy only for the analyzer; ordinary tests/logging must not fail for stdout.

```diff
 interface CheckTask {
+  failOnStdout?: boolean;
@@
     id: "be:deadcode",
     cmd: ["deadcode", "./..."],
+    failOnStdout: true,
@@
-    const success = exitCode === 0;
+    const success = exitCode === 0 &&
+      !(task.failOnStdout && stdoutBuf.trim().length > 0);
```

Keep `allTasks` read-only regardless of flags (`format:check`, `lint:check`). Move program startup into `main()` guarded by `import.meta.main`; export the runner/orchestration functions for Bun tests. Run ESLint fixes then Prettier, then all applicable read-only checks. Abort validation if either fixer fails; preserve selected FE/BE scope and include fixer results in the printed/CI failure report.

```diff
-const results = await Promise.all(activeTasks.map(runTask));
+const fixes: CheckTask[] = isFix && activeTasks.some(t => t.category === "frontend")
+  ? [
+      { id: "fe:lint-fix", name: "Lint fixes", category: "frontend", cmd: ["bun", "run", "lint"], cwd: "frontend" },
+      { id: "fe:format-fix", name: "Format fixes", category: "frontend", cmd: ["bun", "run", "format"], cwd: "frontend" },
+    ]
+  : [];
+const results: TaskResult[] = [];
+for (const task of fixes) {
+  const result = await runTask(task);
+  results.push(result);
+  if (!result.success) break;
+}
+if (results.every(result => result.success)) {
+  results.push(...await Promise.all(activeTasks.map(runTask)));
+}
```

Add `"test:scripts": "bun test scripts"` to root scripts and include a `category: "tooling"` runner-test task in the main gate, including when `--fe` or `--be` is selected. Extend the category union and display labels to include `tooling`; the task filter keeps tooling entries before applying the FE/BE filter. Avoid recursion: its command runs only `scripts/check.test.ts`, whose imports do not execute `main()`. Compute repository paths from the script location; create the Go embed placeholder only when backend checks are selected.

**Verify:** `bun run test:scripts`; `bun check`. Test a zero-exit fake analyzer with findings (fails and displays findings), empty output (passes), failed process startup, fixed-task ordering, fixer failure short-circuit, and `--be --fix` selecting no frontend writers. Test writers against temporary files; do not run `bun check:fix` across unrelated user edits merely to validate this entry.

### Commit 3: `test(frontend): support deferred and rejected Wails calls`

**Rationale:** Navigation races and transport failures need deterministic control over individual requests. Add the harness support once before the behavior regressions.

**Files:** Modify [mock-binding.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/utils/mock-binding.ts), [service-files.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/utils/service-files.ts). Create [rpc-harness.spec.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/rpc-harness.spec.ts).

Keep existing immediate mocks working. Store pending requests by the runtime call ID inside each page, record method and arguments, and expose Playwright helpers to defer a method, inspect its pending requests, and resolve/reject one exact call. Parse the request in a narrow try/catch; do not swallow deliberate transport rejection in the current parsing fallback.

```diff
+export type PendingBindingCall = { callId: string; args: unknown[] };
+export async function deferMockBinding(context: BrowserContext, identifier: BindingIdentifier): Promise<void>
+export async function getPendingBindingCalls(page: Page, identifier: BindingIdentifier): Promise<PendingBindingCall[]>
+export async function resolveMockBindingCall(page: Page, callId: string, response: unknown): Promise<void>
+export async function rejectMockBindingCall(page: Page, callId: string, message: string): Promise<void>
```

The injected fetch shim's key branch becomes:

```diff
+if (deferredMethods.has(methodID)) {
+  return new Promise<Response>((resolve, reject) => {
+    pendingCalls.set(callId, { methodID, args, resolve, reject });
+  });
+}
```

Resolution creates the same successful `Response` envelope as immediate mocks; rejection rejects the fetch promise with `Error(message)`. Delete settled records. Add `CODE_SERVICE` to the existing service-file constants. No pending state is shared across pages or browser contexts.

**Verify:** `bun --cwd frontend run test:e2e -- specs/rpc-harness.spec.ts`. Expected: two calls resolve in reverse order with correct payloads, one rejected call reaches the binding caller, and a fresh page inherits no pending calls.

### Commit 4: `fix(editor): isolate note loading and flush captured saves`

**Rationale:** Autosave loss, stale load application, double decoding, and stale external-write metadata share one note-lifecycle boundary. Fix that boundary together so a partial refactor cannot save one note's contents under another path.

**Files:** Modify [editor/index.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/editor/index.tsx), [toolbar/index.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/editor/toolbar/index.tsx), [hooks/toolbar.ts](/Users/etesam/Coding/bytebook/frontend/src/components/editor/hooks/toolbar.ts), [plugins/save.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/editor/plugins/save.tsx), [utils/note-commands.ts](/Users/etesam/Coding/bytebook/frontend/src/components/editor/utils/note-commands.ts), [editor/atoms.ts](/Users/etesam/Coding/bytebook/frontend/src/components/editor/atoms.ts), [hooks/notes.tsx](/Users/etesam/Coding/bytebook/frontend/src/hooks/notes.tsx). Create [hooks/use-note-session.ts](/Users/etesam/Coding/bytebook/frontend/src/components/editor/hooks/use-note-session.ts), [utils/note-save-queue.ts](/Users/etesam/Coding/bytebook/frontend/src/components/editor/utils/note-save-queue.ts), [note-save-queue.test.ts](/Users/etesam/Coding/bytebook/frontend/src/components/editor/utils/note-save-queue.test.ts), [note-persistence.spec.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/editor/note-persistence.spec.ts).

Use one editor-owned note session shared by load/save/external-write handlers. The session owns the active decoded `FilePath`, a monotonically increasing generation, its current Markdown baseline, pending immutable save snapshot, and dirty state. Remove the global previous-Markdown atom once all references use the session. Keep the editor mounted across route changes to preserve current rename behavior. Create the session once in NotesEditor and pass the same session object through Toolbar and SavePlugin props and into external-write handling; do not create separate hook instances for each consumer.

```diff
-export const debouncedNoteHandleChange = debounce(noteHandleChange, 150);
-const filePath = createFilePath(`${decodeURIComponent(folder)}/${decodeURIComponent(note)}.md`);
+// The loader accepts the decoded FilePath from the route.
+const response = await GetNoteMarkdownWithCodeResults(`notes/${filePath.fullPath}`);
```

Keep the query function pure: return `{ path: filePath.fullPath, markdown, codeResults }`; never mutate Lexical or the baseline in the query function. In a layout effect on path change, synchronously capture/flush old dirty content before disabling/clearing the editor and incrementing generation. Hydrate only the current path/generation from the active query. Apply the initial result once per session, not every background refetch; invalidate the old note's cache after successful persistence. A late result can populate its own query cache but cannot touch the active editor.

```diff
+type NoteSaveSnapshot = {
+  filePath: FilePath;
+  markdown: string;
+  codeResults: CodeResults;
+};
+type NoteSession = {
+  generation: number;
+  filePath: FilePath;
+  previousMarkdown: string;
+  dirty: boolean;
+};
```

Register the editor update listener inside `SavePlugin`; remove the external `OnChangePlugin` debounce. Ignore `note:initial-load` and `note:write-from-external` **before** scheduling. Capture Markdown, code results, metadata, and the owning path while the update's `EditorState` is readable; the timer must not read whichever editor/path is active later. Keep explicit `SAVE_MARKDOWN_CONTENT`, undo, and redo on the same capture path.

The queue's key behavior is:

```diff
+function schedule(snapshot: NoteSaveSnapshot) {
+  pending = snapshot;
+  clearTimeout(timer);
+  timer = setTimeout(flush, 150);
+}
+function flush() {
+  clearTimeout(timer);
+  if (!pending) return;
+  const snapshot = pending;
+  pending = undefined;
+  enqueueSave(snapshot); // serialize RPCs per fullPath; capture payload now
+}
```

`enqueueSave` chains writes per path, allows a later save after an earlier rejection, and routes failures through a `QueryError` mutation/error handler. Do not update an unmounted React component from a settled save. Flush during session transition and unmount before unregistering listeners. For a watcher-confirmed file/folder rename affecting the active session, retarget queued snapshots and the session path to the confirmed new path before the route transition; never recreate the old file. An already-submitted RPC cannot be retargeted, so watcher rename handling must not initiate an extra write to the old path.

Apply external writes through the same session hydration function: retain the current focused-window policy, but treat `markdown === ''` as valid, update the baseline and displayed frontmatter together, and guard the asynchronous `Window.IsFocused()` result against a changed session generation. Update code-result sidecars without scheduling a save loop.

**Verify:** `bun --cwd frontend test src/components/editor/utils/note-save-queue.test.ts`; `bun --cwd frontend run test:e2e -- specs/editor/note-persistence.spec.ts`. Cover edit-then-immediate-note/folder navigation, unmount, A/B responses reversed, save RPCs resolved slowly, rejection then retry, literal `%`/`%20`/space paths, external empty content, external custom metadata preserved on the next edit, and watcher-confirmed rename without an old-path write. Confirm old behavior fails the relevant tests, then run `bun check:fe`.

### Commit 5: `fix(tags): preserve empty tags and render root note tags`

**Rationale:** These two small fixes restore exact tag identity and distinguish an empty authoritative result from unavailable query data.

**Files:** Modify [plugins/save.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/editor/plugins/save.tsx), [tags/index.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/editor/tags/index.tsx), [tags.spec.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/notes/tags.spec.ts).

```diff
-if (tags && tags.length > 0) {
+if (tags !== undefined) {
   frontmatterCopy.tags = tags;
 }
@@
-const tags = (tagsMap?.[`${filePath.folder}/${filePath.note}`] ?? []).sort();
+const tags = [...(tagsMap?.[filePath.fullPath] ?? [])].sort();
```

The clone also prevents mutating the query's cached array during render. Preserve the baseline only when query data is unavailable, not when it is `[]`.

**Verify:** `bun --cwd frontend run test:e2e -- specs/notes/tags.spec.ts`. Remove the only tag, wait for the refreshed empty tag query, edit, and inspect the save payload; it must contain no deleted tag. Open tagged root and nested notes and assert visible chips.

### Commit 6: `fix(sidecar): serialize metadata read-modify-write operations`

**Rationale:** Atomic file replacement does not protect concurrent tag/results updates. A single package mutex is sufficient for this local application and avoids a permanent per-path mutex registry.

**Files:** Modify [sidecar.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/sidecar.go), [tags.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/tags.go), [code_results.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/code_results.go), [tags_test.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/tags_test.go), [code_results_test.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/code_results_test.go).

```diff
+var mutationMu sync.Mutex
+
+func updateData(path string, change func(*Data) error) (Data, error) {
+  mutationMu.Lock()
+  defer mutationMu.Unlock()
+  data, err := read(path)
+  if err != nil { return Data{}, err }
+  if err := change(&data); err != nil { return Data{}, err }
+  if err := write(path, data); err != nil { return Data{}, err }
+  return data, nil
+}
@@
-existing, err := ReadTags(projectPath, folder, fileName)
-finalTags := sanitizeTags(append(existing, newTags...))
-if err := WriteTags(projectPath, folder, fileName, finalTags); err != nil {
+data, err := updateData(PathForFile(projectPath, folder, fileName), func(data *Data) error {
+  data.Tags = sanitizeTags(append(data.Tags, newTags...))
+  return nil
+})
```

Apply the same complete transaction to remove/replace tags and code results. Keep low-level `read`, `write`, and `removeIfExists` unlocked; exported mutations lock once and use unlocked helpers, preventing nested-lock deadlock. `Ensure`, `Move`, and `Delete` use the same mutex. Preserve the code-results empty-file deletion policy under that lock; use an internal update result carrying `remove bool` for that branch rather than writing an empty sidecar afterward.

**Verify:** `go test -race ./internal/notes/sidecar -count=10`. Coordinate additions to the same attachment and additions concurrent with results updates; all successful additions survive and results are retained. Cover delete/add ordering and empty-result cleanup. Assert persisted state, not mutex implementation.

### Commit 7: `fix(sidecar): give files unique metadata paths and migrate legacy data`

**Rationale:** Full filenames eliminate same-stem collisions. Migration belongs in the same commit so existing metadata is not silently orphaned by the new lookup rule.

**Files:** Modify [sidecar.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/sidecar.go), [sidecar_test.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/sidecar_test.go), [tags_test.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/tags_test.go), [code_results_test.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/code_results_test.go), [main.go](/Users/etesam/Coding/bytebook/internal/main.go), [file_watcher.go](/Users/etesam/Coding/bytebook/internal/notes/file_watcher.go), [file_watcher_test.go](/Users/etesam/Coding/bytebook/internal/notes/file_watcher_test.go), [code_results_sidecar_test.go](/Users/etesam/Coding/bytebook/internal/services/code_results_sidecar_test.go). Create [migration.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/migration.go), [migration_test.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/migration_test.go).

```diff
 type Data struct {
+  SchemaVersion int `json:"schemaVersion"`
@@
- stem := strings.TrimSuffix(base, filepath.Ext(base))
- return filepath.Join(dir, "."+stem+".json")
+ return filepath.Join(dir, "."+base+".json")
@@
- noteName := strings.TrimSuffix(strings.TrimPrefix(fileName, "."), ".json") + ".md"
+ noteName := strings.TrimSuffix(strings.TrimPrefix(fileName, "."), ".json")
+ if !strings.EqualFold(filepath.Ext(noteName), ".md") { return "" }
```

All new writes set `schemaVersion: 2`. The marker matters: `.foo.md.json` could be a legacy sidecar for `foo.md.pdf`, so filename shape alone cannot establish ownership. Canonical reads require v2; a present unmarked/unsupported target returns an actionable metadata-conflict error and is never overwritten by `Ensure` or an update.

```diff
+type MigrationConflict struct { Path string; Candidates []string; Reason string }
+type MigrationReport struct { Migrated int; Conflicts []MigrationConflict }
+func MigrateLegacySidecars(notesRoot string) (MigrationReport, error)
```

Run migration after project directories/files are established and before opening the index or starting watchers. Walk visible directories, inventory each directory before changing it, and examine hidden JSON candidates. Unmarked valid sidecars migrate only when exactly one visible regular sibling has the corresponding legacy stem and the destination is absent. Write v2 successfully before deleting the legacy source; preserve both on any conflict. For extensionless owners where source equals destination, atomically update the marker in place. Already-v2 files are untouched. Malformed files, multiple owners, destination collisions, or unknown schemas remain byte-for-byte unchanged and appear in the report. Log exact conflict paths/reasons at startup; do not abort the whole application for an ambiguous file. Fatal traversal/storage errors are surfaced through the existing startup error path.

Watcher reverse lookup additionally confirms a v2 payload before emitting a note's code-results event. Migration is idempotent on every startup, with no guessed association and no overwrite of ambiguous originals. Update fixture literals that encode old sidecar names only where they represent current-format fixtures; retain old literals in migration cases.

**Verify:** `go test ./internal/notes/sidecar ./internal/notes ./internal/services`. Cover same-stem Markdown/PDF/image files with independent metadata; deleting/renaming one preserves the others. Migration cases: one owner, two owners, malformed JSON, existing destination, canonical-looking legacy name, extensionless source, interrupted migration, second run, and watcher reverse lookup.

### Commit 8: `fix(files): roll back paired file and sidecar moves`

**Rationale:** A failed metadata move must not be reported as if the note stayed put. Share the transaction across rename and drag moves, including attachments now that sidecars are per file.

**Files:** Modify [code_results_sidecar.go](/Users/etesam/Coding/bytebook/internal/services/code_results_sidecar.go), [note_service.go](/Users/etesam/Coding/bytebook/internal/services/note_service.go), [file_tree_service.go](/Users/etesam/Coding/bytebook/internal/services/file_tree_service.go), [sidecar.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/sidecar.go), [code_results_sidecar_test.go](/Users/etesam/Coding/bytebook/internal/services/code_results_sidecar_test.go), [sidecar_test.go](/Users/etesam/Coding/bytebook/internal/notes/sidecar/sidecar_test.go).

Add `sidecar.MoveFileWithMetadata(src, dst string) error`, holding the package mutation lock across destination checks and both renames. Existing `sidecar.Move` remains metadata-only for external watcher renames. Use the existing case-aware collision helper; preserve same-file/case-only rename behavior. Directories still use one directory rename, carrying their children.

```diff
- if err := os.Rename(srcPath, uniqueDstPath); err != nil { return err }
- if filepath.Ext(srcPath) != ".md" { return nil }
- return sidecar.Move(srcPath, uniqueDstPath)
+ return sidecar.MoveFileWithMetadata(srcPath, uniqueDstPath)
```

Core paired operation after preflight:

```diff
+if err := rename(src, dst); err != nil { return err }
+if !hasSidecar { return nil }
+if err := rename(srcSidecar, dstSidecar); err != nil {
+  if rollbackErr := rename(dst, src); rollbackErr != nil {
+    return errors.Join(err, fmt.Errorf("file moved to %s; rollback failed: %w", dst, rollbackErr))
+  }
+  return err
+}
+return nil
```

Inject the rename function through a private helper for deterministic second-operation/rollback failures, not a mutable global. Unique-name selection considers both content and metadata destinations. `RenameFile` rejects collisions; `MoveItemsToFolder` retains unique-name behavior. Batch moves retain partial-success semantics across different selected items; do not roll back unrelated successful items. The UI must refetch actual paths after any result (next entry). A watcher echo after a successful service transaction finds no source sidecar and remains a no-op.

**Verify:** `go test ./internal/services ./internal/notes/sidecar`. Assert orphan target collision makes no changes; injected second rename failure restores source bytes and metadata; rollback failure reports the actual destination; attachments, uppercase Markdown extensions, directories, unique names, case-only rename, and watcher echo remain correct.

### Commit 9: `fix(tree): restore failed moves from actual model membership`

**Rationale:** Refetching an unchanged canonical array cannot repair an independently mutated optimistic model. Rollback must be explicit, with authoritative reconciliation after completion.

**Files:** Modify [tree/index.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/virtualized/virtualized-file-tree/index.tsx), [use-sync-all-paths.ts](/Users/etesam/Coding/bytebook/frontend/src/components/virtualized/virtualized-file-tree/hooks/use-sync-all-paths.ts), [tree-item-mutations.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/virtualized/virtualized-file-tree/hooks/tree-item-mutations.tsx), [model-utils.ts](/Users/etesam/Coding/bytebook/frontend/src/components/virtualized/virtualized-file-tree/model-utils.ts), [folder-sidebar.spec.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/folder-sidebar.spec.ts). Create [model-reconciliation.test.ts](/Users/etesam/Coding/bytebook/frontend/src/components/virtualized/virtualized-file-tree/model-reconciliation.test.ts).

Extract `reconcileTreePaths(model, canonicalPaths)` using current tracked model paths **before** replacing the row-order cache. Add each canonical path missing from the model; remove each actual noncanonical path, collapsing recursive removals. Preserve existing reset threshold and expansion/selection handling through public Pierre APIs.

```diff
- if (!allPaths || lastSyncedPathsRef.current === allPaths) return;
+ if (!allPaths || isFetching) return;
@@
- const added = allPaths.filter(path => !previous.has(path) && !model.getItem(path));
+ const added = allPaths.filter(path => !model.getItem(path));
```

Run reconciliation on completed query updates (`dataUpdatedAt`), even when structural sharing reuses `data`; do not roll back from a stale list while its refetch is pending. In `onDropComplete`, attach a rejection handler and immediately reconcile to the latest cached canonical list, then fetch/reconcile the authoritative list. Both success and failure perform that final fetch; this corrects partial successes and backend unique destination names. Catch rejection so it is not also an unhandled promise; retain the global QueryError toast. Avoid overlapping moves in one model while a move is pending by returning false from drag-start/drop eligibility until settled.

```diff
- void moveItems({ itemPaths: result.draggedPaths, newFolder: destination });
+ void moveItems({ itemPaths: result.draggedPaths, newFolder: destination })
+   .catch(() => reconcileTreePaths(model, latestCanonicalPaths()))
+   .finally(() => refetchAndReconcileTree());
```

**Verify:** `bun --cwd frontend test src/components/virtualized/virtualized-file-tree/model-reconciliation.test.ts`; `bun --cwd frontend run test:e2e -- specs/folder-sidebar.spec.ts`. Reject a drag with unchanged `GetAllPaths`; the source returns, the phantom destination disappears, and selection remains usable. Cover partial batch success, server-chosen unique name, delayed authoritative response, and an unrelated watcher update during failure recovery.

### Commit 10: `fix(search): preserve saved searches and watch atomic replacements`

**Rationale:** Saved-search read errors and file-watch replacement both break the same persistence boundary. Correct them together with repeat-write regression coverage.

**Files:** Modify [saved_searches.go](/Users/etesam/Coding/bytebook/internal/search/saved_searches.go), [saved_searches_test.go](/Users/etesam/Coding/bytebook/internal/search/saved_searches_test.go), [file_watcher.go](/Users/etesam/Coding/bytebook/internal/notes/file_watcher.go), [file_watcher_test.go](/Users/etesam/Coding/bytebook/internal/notes/file_watcher_test.go).

```diff
- if err != nil { return []SavedSearch{}, nil }
+ if errors.Is(err, os.ErrNotExist) { return []SavedSearch{}, nil }
+ if err != nil { return nil, fmt.Errorf("read saved searches: %w", err) }
@@
- if err != nil { savedSearches = SavedSearches{Searches: []SavedSearch{}} }
+ if errors.Is(err, os.ErrNotExist) {
+   savedSearches = SavedSearches{Searches: []SavedSearch{}}
+ } else if err != nil {
+   return fmt.Errorf("read saved searches before adding: %w", err)
+ }
@@
- savedSearchesPath := filepath.Join(projectPath, "search", "saved-searches.json")
- pathsToWatch := []string{settingsPath, savedSearchesPath}
+ searchPath := filepath.Join(projectPath, "search")
+ pathsToWatch := []string{settingsPath, searchPath}
```

Retain exact-name event filtering so Bleve files/temp files do not emit saved-search updates. A malformed or empty existing file is an error, not permission to replace it. Preserve original bytes on every read failure.

**Verify:** `go test ./internal/search ./internal/notes`. Test malformed/empty input, missing file creation, duplicate name, repeated atomic saves, and delete/recreate. Synchronize real fsnotify events with channels and deadlines; no sleep-based assertions.

### Commit 11: `refactor(indexing): preserve typed events and canonical root paths`

**Rationale:** Typed payloads eliminate repeated map validation and fix the root-folder `.` identity inconsistency at the shared split boundary.

**Files:** Modify [events/notes.go](/Users/etesam/Coding/bytebook/internal/events/notes.go), [events/notes_test.go](/Users/etesam/Coding/bytebook/internal/events/notes_test.go), [search_service_test.go](/Users/etesam/Coding/bytebook/internal/services/search_service_test.go), [util/notes.go](/Users/etesam/Coding/bytebook/internal/util/notes.go), [util/notes_test.go](/Users/etesam/Coding/bytebook/internal/util/notes_test.go).

Reuse `util.SplitFolderAndFile` for every root/nested path split; verify that its root result is the empty string. Pass existing `[]util.FileCreateEventData`, `[]util.FileWriteEventData`, `[]util.FileRenameEventData`, and `[]util.FileDeleteEventData` directly to index helpers. Update local-link rewrite helpers to accept typed rename data. Delete the map adapters and key-presence branches.

```diff
-func addCreatedNotesToIndex(params EventParams, data []map[string]string) {
+func addCreatedNotesToIndex(params EventParams, data []util.FileCreateEventData) {
@@
- folder, ok := note["folder"]
- noteName, ok := note["note"]
+ folder, noteName := util.SplitFolderAndFile(note.FilePath)
```

Write events already represent a successful watcher read; index `item.Markdown` directly, including the empty string. Preserve batching/retry policy and sidecar move idempotency. Do not combine this with unrelated folder-index performance work.

**Verify:** `go test ./internal/events ./internal/util ./internal/services`. Create/write/rename a root note and compare its search path with initial indexing; both must be `root.md`. Cover nested paths, rename into/out of root, empty Markdown indexing, and local-link updates.

### Commit 12: `fix(search): refresh filters after committed index writes`

**Rationale:** Raw filesystem events can precede indexing and cannot guarantee a final refresh. Emit completion at the published index boundary so imports, edits, tags, deletes, and regeneration all converge.

**Files:** Modify [index_holder.go](/Users/etesam/Coding/bytebook/internal/search/index_holder.go), [util/events.go](/Users/etesam/Coding/bytebook/internal/util/events.go), [events/tags.go](/Users/etesam/Coding/bytebook/internal/events/tags.go), [frontend events.ts](/Users/etesam/Coding/bytebook/frontend/src/utils/events.ts), [use-tree-filter.ts](/Users/etesam/Coding/bytebook/frontend/src/components/virtualized/virtualized-file-tree/hooks/use-tree-filter.ts). Create [index_holder_test.go](/Users/etesam/Coding/bytebook/internal/search/index_holder_test.go), [tree-filter.spec.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/tree-filter.spec.ts). Regenerate [eventdata.d.ts](/Users/etesam/Coding/bytebook/frontend/bindings/github.com/wailsapp/wails/v3/internal/eventdata.d.ts) and [eventcreate.js](/Users/etesam/Coding/bytebook/frontend/bindings/github.com/wailsapp/wails/v3/internal/eventcreate.js).

Wrap only the holder's published index in a private `committedIndex` embedding `indexDelegate`, a private alias interface containing `bleve.Index`; override `Index`, `Delete`, and `Batch`. On successful nonempty mutation, emit `search:index_update` with a void payload. Failed writes emit nothing; empty batches emit nothing. The temporary regeneration index remains raw; successful holder replacement emits once. Avoid double wrappers on recovered handles. Emit through the existing app-nil guard; tests inject a private callback.

```diff
+const EventSearchIndexUpdate = "search:index_update"
+application.RegisterEvent[application.Void](EventSearchIndexUpdate)
@@
+type indexDelegate interface { bleve.Index }
+type committedIndex struct { indexDelegate; onCommit func() }
+func (i *committedIndex) Batch(batch *bleve.Batch) error {
+  if err := i.indexDelegate.Batch(batch); err != nil { return err }
+  if batch.Size() > 0 { i.onCommit() }
+  return nil
+}
@@
-useWailsEvent(FILE_CREATE, invalidate);
-useWailsEvent(FILE_DELETE, invalidate);
-useWailsEvent(FILE_RENAME, invalidate);
+useWailsEvent(SEARCH_INDEX_UPDATE, invalidate);
+useWailsEvent(TAGS_INDEX_UPDATE, invalidate);
```

Remove the folder raw-event subscriptions from the filter too; the separate all-paths watcher remains unchanged. Existing tag-completion notification must be emitted only when its batch succeeds. Listener emission must not synchronously reenter the holder's lock; dispatch through the app event mechanism without invoking index readers inline.

**Verify:** `go test ./internal/search ./internal/events`; `bun --cwd frontend run e2e:prepare`; `bun --cwd frontend run test:e2e -- specs/tree-filter.spec.ts`. Assert successful Index/Delete/Batch and successful swap notify, failed writes do not, and temporary rebuilds do not. In E2E, hold a stale query until one completed-index event and verify a lone content/tag/create/delete change refreshes the filter.

### Commit 13: `fix(indexing): cancel and join workers after failures`

**Rationale:** The consumer can exit while bounded-channel producers remain blocked. Give both indexing entrypoints one owned pipeline lifecycle.

**Files:** Modify [file_indexing.go](/Users/etesam/Coding/bytebook/internal/search/file_indexing.go), [file_indexing_test.go](/Users/etesam/Coding/bytebook/internal/search/file_indexing_test.go).

Extract one private pipeline function accepting a producer callback. Create an internal context, cancel it on producer/consumer errors, and wait for producer and workers before returning. Keep the public `IndexAllFiles` and `IndexDiscoveredFiles` signatures unchanged. The producer alone closes jobs; a worker-waiter alone closes results. Each send and receive selects on cancellation.

```diff
- jobs <- job
+ select {
+ case jobs <- job:
+ case <-ctx.Done(): return ctx.Err()
+ }
@@
- results <- result
+ select {
+ case results <- result:
+ case <-ctx.Done(): return
+ }
@@
+defer func() { cancel(); producerWG.Wait(); workerWG.Wait() }()
```

Return the original batch/producer error rather than replacing it with `context.Canceled`; propagate producer traversal errors currently only logged. Individual unreadable files retain the current skip/log policy. The final batch is flushed only after successful pipeline completion.

**Verify:** `go test -race ./internal/search -run 'TestIndex(AllFiles|DiscoveredFiles|Pipeline)' -count=5`. Inject the first batch failure with input larger than both channel capacities, wait for explicit worker/producer completion, and assert no lingering work. Cover producer failure, successful final partial batch, and both public entrypoints.

### Commit 14: `fix(search): recover the previous index when replacement fails`

**Rationale:** Once the old index is closed, returning an error without replacing the holder leaves a dead handle. Preserve a backup and return the recovered usable handle even when regeneration itself fails.

**Files:** Modify [index_mapping.go](/Users/etesam/Coding/bytebook/internal/search/index_mapping.go), [index_holder.go](/Users/etesam/Coding/bytebook/internal/search/index_holder.go), [index_mapping_test.go](/Users/etesam/Coding/bytebook/internal/search/index_mapping_test.go), [index_holder_test.go](/Users/etesam/Coding/bytebook/internal/search/index_holder_test.go), [search_service.go](/Users/etesam/Coding/bytebook/internal/services/search_service.go).

Build the replacement as today. During commit: close the replacement, close the old handle with errors respected, rename the old directory to `.backup`, install the temporary directory, then open the new final index. Delete backup only after successful open. On failure, restore the old directory and reopen it; return that handle together with the regeneration error. Use a private filesystem/open operations argument for deterministic failure injection. Startup opening recovers `.backup` if the final directory is absent; never delete the only usable backup during cleanup.

```diff
 newIdx, err := fn(h.idx)
-if err != nil { return err }
-h.idx = newIdx
-return nil
+if newIdx != nil { h.idx = h.wrapPublished(newIdx) }
+if err == nil { h.notifyCommitted() }
+return err
```

The callback contract is explicit: return the still-valid old handle on pre-close failures; return a reopened recovery handle on post-close failures; return the new handle only after successful open. If both installation and recovery fail, preserve directories and return joined errors; install an unavailable-index adapter (embedding the private indexDelegate interface but overriding Search/SearchInContext, Document, Index, Delete, Batch, and DocCount to return the recorded error). `NewBatch` remains safe and creates a batch; no caller receives nil or accidentally uses the closed handle. Recovery can be retried through regeneration. Do not label a recovery as a successful index update.

**Verify:** `go test ./internal/search ./internal/services`. Inject failures closing/installing/opening and assert the holder still searches old content after recoverable errors. Test startup with only backup, success cleanup, no-old-index creation, and double failure returning a controlled error with preserved backup. Run `go test -race ./internal/search` for concurrent read/swap exclusion.

### Commit 15: `fix(settings): merge field patches and derive appearance from accepted state`

**Rationale:** Whole-object writes from stale snapshots lose unrelated settings. The backend merge, all callers, and frontend state publication must change together so every interaction uses the same contract.

**Files:** Modify [file-sidebar/index.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/file-sidebar/index.tsx), [folder-sidebar.spec.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/folder-sidebar.spec.ts), [settings_service.go](/Users/etesam/Coding/bytebook/internal/services/settings_service.go), [config/project.go](/Users/etesam/Coding/bytebook/internal/config/project.go), [config/project_test.go](/Users/etesam/Coding/bytebook/internal/config/project_test.go), [hooks/project-settings.tsx](/Users/etesam/Coding/bytebook/frontend/src/hooks/project-settings.tsx), [hooks/notes.tsx](/Users/etesam/Coding/bytebook/frontend/src/hooks/notes.tsx), [hooks/code.tsx](/Users/etesam/Coding/bytebook/frontend/src/hooks/code.tsx), [non-markdown-toolbar.tsx](/Users/etesam/Coding/bytebook/frontend/src/routes/notes-sidebar/render-note/non-markdown-toolbar.tsx), [settings-dropdown.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/editor/toolbar/settings-dropdown.tsx), [code-block-page.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/settings-dialog/code-block-page.tsx), [default-language-row.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/settings-dialog/default-language-row.tsx), [line-height-row.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/settings-dialog/appearance/line-height-row.tsx), [empty-line-placeholder-row.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/settings-dialog/appearance/empty-line-placeholder-row.tsx), [theme-row.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/settings-dialog/appearance/theme-row.tsx), [table-of-contents-row.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/settings-dialog/appearance/table-of-contents-row.tsx), [note-width-row.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/settings-dialog/appearance/note-width-row.tsx), [font-family-row.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/settings-dialog/appearance/font-family-row.tsx), [font-size-row.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/settings-dialog/appearance/font-size-row.tsx), [sidebar-sections-row.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/settings-dialog/appearance/sidebar-sections-row.tsx), [settings-dialog.spec.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/settings-dialog.spec.ts), [mock-responses.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/utils/mock-responses.ts). Create [config/settings_patch.go](/Users/etesam/Coding/bytebook/internal/config/settings_patch.go), [settings_patch_test.go](/Users/etesam/Coding/bytebook/internal/config/settings_patch_test.go), [settings_service_test.go](/Users/etesam/Coding/bytebook/internal/services/settings_service_test.go). Regenerate [settingsservice.js](/Users/etesam/Coding/bytebook/frontend/bindings/github.com/etesam913/bytebook/internal/services/settingsservice.js) and [config/models.js](/Users/etesam/Coding/bytebook/frontend/bindings/github.com/etesam913/bytebook/internal/config/models.js).

Replace `UpdateProjectSettings` with `PatchProjectSettings`. Define typed nested patch structs with pointer leaves corresponding to the existing appearance/code/sidebar fields; omitted/nil leaves mean unchanged, while false, zero, and empty strings are explicit supplied values. Preserve existing normalization/default policy. ProjectPath is server-owned and absent from the patch. Pins use add/remove operations, not array replacement, so separate windows cannot overwrite each other's selections. Custom venv paths similarly use additions/removals.

```diff
+type ProjectSettingsPatch struct {
+  Appearance *AppearanceSettingsPatch `json:"appearance,omitempty"`
+  Code *CodeSettingsPatch `json:"code,omitempty"`
+  AddPinned []string `json:"addPinned,omitempty"`
+  RemovePinned []string `json:"removePinned,omitempty"`
+}
+type CodeSettingsPatch struct {
+  CodeBlockVimMode *bool `json:"codeBlockVimMode,omitempty"`
+  CodeBlockLineWrapping *bool `json:"codeBlockLineWrapping,omitempty"`
+  CodeBlockShowLineNumbers *bool `json:"codeBlockShowLineNumbers,omitempty"`
+  CodeBlockFontFamily *string `json:"codeBlockFontFamily,omitempty"`
+  CodeBlockFontSize *int `json:"codeBlockFontSize,omitempty"`
+  CodeBlockDefaultLanguage *string `json:"codeBlockDefaultLanguage,omitempty"`
+  PythonVenvPath *string `json:"pythonVenvPath,omitempty"`
+  AddCustomPythonVenvPaths []string `json:"addCustomPythonVenvPaths,omitempty"`
+  RemoveCustomPythonVenvPaths []string `json:"removeCustomPythonVenvPaths,omitempty"`
+}
```

`AppearanceSettingsPatch` contains pointers for every existing appearance leaf, including a pointer to `SidebarVisibilityPatch` whose five hide flags are `*bool`. Merge only provided fields; for the same value present in both additions and removals, removal wins. Normalize/deduplicate pins and venv paths using existing helpers. All writes use one config-owned mutex across read/merge/normalize/write, including `updatePinnedNotesOnDisk` and settings initialization. Keep unlocked internals for use inside this transaction; never recursively acquire the mutex. A backend patch returns the full accepted settings through the current BackendResponse shape.

```diff
-func (s *SettingsService) UpdateProjectSettings(newProjectSettings config.ProjectSettingsJson) config.BackendResponseWithData[config.ProjectSettingsJson]
+func (s *SettingsService) PatchProjectSettings(patch config.ProjectSettingsPatch) config.BackendResponseWithData[config.ProjectSettingsJson]
@@
-updateProjectSettings({ newProjectSettings: { ...projectSettings, code: { ...projectSettings.code, codeBlockVimMode: isSelected } } });
+patchProjectSettings({ code: { codeBlockVimMode: isSelected } });
@@
-return updateProjectSettings({ newProjectSettings });
+return patchProjectSettings(shouldPin ? { addPinned: paths } : { removePinned: paths });
```

Keep the frontend query function pure. Extract pure settings normalization from `validateProjectSettingsWrapper`, then apply normalized settings to the atom and all CSS variables in one effect. Remove optimistic CSS writes from `onMutate`. Successful mutations and SETTINGS_UPDATE events invalidate/refetch the one shared settings query instead of publishing separate snapshots. Await this refresh in `onSuccess`; use mutation `scope: { id: 'project-settings' }` to order same-window submissions, while backend locking protects cross-window merges. Controls show accepted values; failed saves leave both controls and CSS at their prior accepted values. Do not add an optimistic replica or store entire stale objects in mutation variables.

Update every caller listed above to send only the field/operation it changed. Venv selection sends interpreter plus added custom path in one patch before the existing kernel shutdown step. Update test mocks and assertions for the new binding name/payload, and remove the old binding when generation completes. Check all test references with `rg UpdateProjectSettings frontend` and update any remaining test setup to `PatchProjectSettings` in the same commit.

**Verify:** `go test -race ./internal/config ./internal/services`; `bun --cwd frontend run e2e:prepare`; `bun --cwd frontend run test:e2e -- specs/settings-dialog.spec.ts specs/notes/tags.spec.ts specs/folder-sidebar.spec.ts`. Hold settings events while toggling Vim and wrapping; inspect patches and confirm both persist. Simultaneous backend patches and pin-rename changes must preserve unrelated fields. Cover explicit false/empty values, load/event/success/failure CSS consistency, and two windows changing different settings.

### Commit 16: `fix(kernel): recover heartbeat requests after receive timeouts`

**Rationale:** A REQ socket cannot send a second request while awaiting its original reply. Recovery must reset that transport state rather than count state-machine errors as fresh missed heartbeats.

**Files:** Modify [heartbeat_socket.go](/Users/etesam/Coding/bytebook/internal/jupyter_protocol/sockets/heartbeat_socket.go). Create [heartbeat_socket_test.go](/Users/etesam/Coding/bytebook/internal/jupyter_protocol/sockets/heartbeat_socket_test.go).

Keep strict REQ semantics. After a receive timeout or send failure, close the old socket with zero linger and create/connect a new REQ socket before the next ticker iteration. Configure both send and receive deadlines before use and check option/connect errors. The listener goroutine alone owns creation/use/close; cancellation never closes the same socket concurrently. The deferred close must reference the current socket, not the original captured receiver.

```diff
+func (h *heartbeatSocket) reconnect(address string) error {
+  if h.socket != nil {
+    _ = h.socket.SetLinger(0)
+    _ = h.socket.Close()
+    h.socket = nil
+  }
+  sock, err := zmq4.NewSocket(zmq4.REQ)
+  if err != nil { return err }
+  if err := sock.SetLinger(0); err != nil { _ = sock.Close(); return err }
+  if err := sock.SetSndtimeo(2 * time.Second); err != nil { _ = sock.Close(); return err }
+  if err := sock.SetRcvtimeo(2 * time.Second); err != nil { _ = sock.Close(); return err }
+  if err := sock.Connect(address); err != nil { _ = sock.Close(); return err }
+  h.socket = sock
+  return nil
+}
```

Count one failed heartbeat attempt per tick; reconnect failures also count once per attempt, with no tight retry loop. Preserve five consecutive failures and reset the count after success. If reconnect fails, the next tick retries connection without dereferencing nil. Check cancellation between attempts.

**Verify:** `go test -race ./internal/jupyter_protocol/sockets -run TestHeartbeat -count=5`. Use a test REP/ROUTER peer and configurable test durations via private constructor parameters. Delay one reply beyond timeout, then serve subsequent requests: heartbeat must recover without cancellation. Consecutive real failures must cancel at the configured threshold; shutdown must close the current socket once.

### Commit 17: `fix(kernel): reserve launch capacity and protect pending executions`

**Rationale:** Pool limits and eviction eligibility must cover work already accepted but not yet represented by a busy event. Fix launch and execution admission under a consistent lock order.

**Files:** Modify [kernel_manager/manager.go](/Users/etesam/Coding/bytebook/internal/kernel_manager/manager.go), [kernel_manager/instance.go](/Users/etesam/Coding/bytebook/internal/kernel_manager/instance.go), [services/code_service.go](/Users/etesam/Coding/bytebook/internal/services/code_service.go), [jupyter_protocol/messaging.go](/Users/etesam/Coding/bytebook/internal/jupyter_protocol/messaging.go). Create [kernel_manager/manager_test.go](/Users/etesam/Coding/bytebook/internal/kernel_manager/manager_test.go) and [kernel_manager/instance_test.go](/Users/etesam/Coding/bytebook/internal/kernel_manager/instance_test.go).

Use a manager-owned per-language launch gate plus a pending-launch map keyed by `(language,noteID)` with a completion channel, result, and error. Same-note callers await the same launch result; different-note launches of the same language are admitted serially. Waiters can cancel their wait without canceling the shared launch, whose lifetime belongs to the manager. Never hold the manager map mutex during process startup/heartbeat waits. Pending launch slots count against the three-kernel cap and are released on every failed/canceled launch. Shutdown waits for or cancels manager-owned pending launches before returning.

```diff
+type pendingLaunch struct {
+  done chan struct{}
+  instance *KernelInstance
+  err error
+}
+// manager: pending map[langNoteKey]*pendingLaunch
+// instance: retiring bool
```

Reserve an execution in `activeExecutions` before sending, keyed by the exact final Jupyter parent message ID. Move timestamp construction into a shared request-ID helper so reservation, outgoing header, busy, and idle use the same key; do not append a second timestamp in the message writer. Keep the external Wails SendExecuteRequest signature unchanged. Remove the unused `executionQueue` field once pending/in-flight executions share one map.

```diff
+ i.mu.Lock()
+ if i.retiring { i.mu.Unlock(); return ErrKernelRetiring }
+ i.activeExecutions[messageID] = struct{}{}
+ i.lastActivityAt = time.Now()
+ i.mu.Unlock()
  if err := sendExecute(messageID, code); err != nil {
+   i.trackExecutionEnd(messageID)
    return err
  }
```

Eviction atomically claims an instance under its mutex only when heartbeat is alive and `activeExecutions` is empty; set `retiring=true` before removing it from manager maps. `SendExecute` refuses a retiring instance. Iterate candidates until a claim succeeds; never evict the lone candidate if its recheck fails. Lock order is manager then instance; instance code never acquires manager lock while holding its lock. If execution loses an eviction race before reservation, the service retries GetOrCreate once on `ErrKernelRetiring`, then reports failure normally.

**Verify:** `go test -race ./internal/kernel_manager ./internal/services -count=5`. Inject launch/send functions through constructors or private helpers and use barriers: simultaneous distinct-note launches never exceed cap; same-note launch occurs once; failure releases capacity; a sent request awaiting busy cannot be evicted; send failure removes reservation; busy does not double-count; idle releases it; a newly busy sole eviction candidate remains alive; shutdown cleans pending launches.

### Commit 18: `fix(lsp): serialize document opening and change notifications`

**Rationale:** Document mutation, version/text capture, and transmission must be one ordered operation. This is distinct from the test-receipt fix in commit 1.

**Files:** Modify [lsp/instance.go](/Users/etesam/Coding/bytebook/internal/lsp/instance.go), [lsp/virtualdoc.go](/Users/etesam/Coding/bytebook/internal/lsp/virtualdoc.go), [lsp/instance_test.go](/Users/etesam/Coding/bytebook/internal/lsp/instance_test.go), [lsp/virtualdoc_test.go](/Users/etesam/Coding/bytebook/internal/lsp/virtualdoc_test.go).

Add a dedicated document-operation mutex, distinct from lifecycle `mu`. All DidChange, RemoveBlock, and initial-open paths acquire it; capture version/text together in one `VirtualDoc.Snapshot()` call. Mark opened only after successful DidOpen transmission. Failure leaves it retryable. Completion/hover must wait for initial opening and preceding document notifications before translating coordinates and sending their request; hold the document mutex through the existing synchronous completion/hover RPC, bounded by the existing request context deadline. This deliberately trades bounded edit-notification latency for ordering without replacing the transport API.

```diff
- lspInstance.opened = true
- lspInstance.mu.Unlock()
- return lspInstance.srv.DidOpen(ctx, params)
+ if err := lspInstance.srv.DidOpen(ctx, params); err != nil { return err }
+ lspInstance.opened = true
+ return nil
@@
+ lspInstance.documentMu.Lock()
+ defer lspInstance.documentMu.Unlock()
  if err := lspInstance.didOpenIfNeededLocked(ctx); err != nil { return err }
  lspInstance.doc.UpsertBlock(blockID, order, source)
+ version, text := lspInstance.doc.Snapshot()
```

`Snapshot() (int32, string)` takes the virtual-document mutex once and returns its version and complete synthetic text. Use those values in the notification. Keep lifecycle shutdown/connection handling able to cancel blocked operations without taking documentMu; do not introduce inverse lock order. Private fake-transport seams can fail/block notification sends without a real Pyright process.

**Verify:** `go test -race ./internal/lsp -count=20`. Force concurrent first changes; assert one successful didOpen precedes all changes. Fail first open then retry. Concurrent edits/removals must produce ordered version/text snapshots. Completion/hover after an edit must use its coordinates; canceled/closed transports must not deadlock. The fake server waits for receipt via commit 1's synchronization.

### Commit 19: `fix(code): restore runnable state after rejected execution calls`

**Rationale:** Backend rejection and transport rejection need the same recovery transition so the user can retry.

**Files:** Modify [hooks/code.tsx](/Users/etesam/Coding/bytebook/frontend/src/hooks/code.tsx). Create [code-execution.spec.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/editor/code-execution.spec.ts).

```diff
  return useMutation({
+   onError: () => { setStatus('idle'); },
    mutationFn: async ({ code, newExecutionId }) => {
      setStatus('queueing');
@@
      if (!res.success) {
-       setStatus('idle');
        throw new QueryError(res.message);
      }
```

Wrap binding transport errors as QueryError so the existing global error handler reports them. Track the attempt's execution ID and only reset the matching block/attempt; a late failure must not reset a newer execution. Apply the returned kernel instance ID only when the CodeNode still belongs to that attempt. Do not change successful busy/idle event handling.

**Verify:** `bun --cwd frontend run test:e2e -- specs/editor/code-execution.spec.ts`. Reject the execute binding promise and assert Run becomes enabled and error feedback appears; retry successfully. Also cover `{success:false}` and a stale rejected attempt after a newer execution ID.

### Commit 20: `refactor(completion): mount one shared reply dispatcher per editor`

**Rationale:** Every code block currently registers an identical listener against one global pending-request map. One dispatcher removes duplicate event work without changing per-block completion logic.

**Files:** Modify [hooks/code-completion.ts](/Users/etesam/Coding/bytebook/frontend/src/hooks/code-completion.ts), [plugins/code.tsx](/Users/etesam/Coding/bytebook/frontend/src/components/editor/plugins/code.tsx). Create [code-completion.spec.ts](/Users/etesam/Coding/bytebook/frontend/tests/e2e/specs/editor/code-completion.spec.ts).

```diff
+export function useCodeCompletionReplies() {
+  useWailsEvent(CODE_BLOCK_COMPLETE_REPLY, ({ data }) => {
+    if (data.messageId) pendingCompletions.get(data.messageId)?.(data);
+  });
+}
@@
 export function useCompletionExtension(inputs: CompletionInputs): Extension {
-  useWailsEvent(CODE_BLOCK_COMPLETE_REPLY, ...);
   const source = buildCompletionSource(inputs);
@@
 export function CodePlugin() {
+  useCodeCompletionReplies();
```

Keep request ID correlation, timeout cleanup, per-block source construction, and current result-merging policy. The dispatcher stays mounted for the editor lifetime; removing a block must not remove the listener for other blocks. Do not change the backend request ID API in this cleanup.

**Verify:** `bun --cwd frontend run test:e2e -- specs/editor/code-completion.spec.ts`. Two blocks request completions concurrently, replies arrive in reverse order, and each receives its own result. Remove one block while another request is pending and verify the remaining request completes. Run `bun check:fe` to confirm the relocated hook is used and no dead exports remain.

## Audit coverage map

| Finding from delivered reports | Commit |
| --- | --- |
| LSP test notification-count failure | 1 |
| Deadcode output hidden; fix tools race validation | 2 |
| Autosave/navigation loss, stale load, percent filenames, external empty writes/baseline | 4 |
| Last tag resurrected; root-note tags hidden | 5 |
| Concurrent sidecar tag/results updates | 6 |
| Same-stem sidecar collisions; preserve/migrate metadata | 7 |
| Failed filesystem move separates metadata | 8 |
| Failed optimistic tree moves leave phantom paths | 9 |
| Saved-search read errors overwrite data; watch lost after atomic save | 10 |
| Typed event cleanup and canonical root index paths | 11 |
| Filter invalidation races indexing and misses content/tag changes | 12 |
| Indexing workers leak after batch failure | 13 |
| Index replacement retains a closed handle after failure | 14 |
| Settings CSS duplication/failure drift; rapid/cross-window lost updates | 15 |
| Heartbeat timeout poisons subsequent requests | 16 |
| Kernel launch cap race; pending execution eviction | 17 |
| LSP opening/change ordering | 18 |
| Rejected execute RPC leaves loading state | 19 |
| Repeated per-block completion dispatcher | 20 |

Commit 3 supplies deterministic tests for subsequent frontend entries. This sequence covers every ranked item in both reports; related issues are grouped only where they share a correctness boundary.

## Final acceptance and rollout

After all entries, run these once against the completed sequence:

```sh
bun check
go test -race ./internal/kernel_manager ./internal/lsp ./internal/notes/sidecar
bun --cwd frontend run e2e:prepare
bun --cwd frontend run test:e2e
```

Review generated bindings for unexpected changes, review the cumulative `jj diff`, and confirm the unrelated `note-title.tsx` edit remains outside these commits. Backend tests should exercise production helpers through real temp directories; E2E tests must drive public controls and intercepted bindings/events, not private React state. Test names must identify the user-visible regression.

Manual desktop smoke test on a disposable project: import legacy sidecars with one unambiguous owner and one ambiguous pair; verify the unambiguous metadata survives startup, the ambiguous original is unchanged, and the conflict is reported. Edit then immediately navigate, remove the last tag then edit again, perform a failed move, change two settings quickly, refresh an active text/tag filter after a write, and run/interrupt code while creating kernels at capacity. This smoke test supplements deterministic regressions; it does not replace them.

No feature flag is required. Sidecar migration is idempotent and keeps unresolved originals; index replacement keeps a recoverable backup until the new index is open. Do not promise recovery from a storage device that rejects both the original operation and rollback: report that failure explicitly and preserve the last usable backup. No deployment or remote publication is included.
