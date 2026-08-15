---
name: multi-commit-plan
description: >-
  Creates structured multi-commit execution plans containing concrete code diffs
  and guides atomic, single-commit-at-a-time implementation and verification.
  Use this skill when planning multi-step features, refactors, or bugfixes that
  should be executed and committed incrementally.
---

# Multi-Commit Plan

This skill guides the creation and step-by-step execution of structured implementation plans broken into atomic, independently verifiable Git commits. Each planned commit includes concrete code diffs rather than purely high-level prose, and execution proceeds strictly **one commit at a time**.

---

## 1. Planning Phase: Creating the Plan

When creating a multi-commit plan:

### Structure of the Plan

Organize the plan as a sequence of discrete commits. For each commit, include:

1. **Commit Metadata**
   - **Commit Title / Summary**: Imperative mood (e.g., `feat(editor): add autosave debounce hook`).
   - **Rationale**: 1–2 sentences explaining why this unit of work is isolated into its own commit.

2. **Affected Files**
   - Clickable markdown links to every file created, modified, or deleted:
     - `[filename.ext](file:///absolute/path/to/file.ext)` or symbol links `[symbol](file:///path/to/file#L10-L20)`.

3. **Concrete Diffs & Code Changes**
   - Use fenced `diff` blocks (` ```diff `) showing exact additions (`+`), deletions (`-`), and context lines.
   - Avoid vague descriptions like _"update the handler to process new types"_; show the actual signature or code change.
   - For new files, show the complete starter implementation or key functions.

4. **Verification & Tests**
   - Exact commands to run (e.g., unit test, type-check, linter).
   - Expected observable outcome to verify the commit is green before moving forward.

### Example Plan Entry Format

````markdown
### Commit 1: `refactor(search): extract query sanitizer into helper`

**Rationale**: Isolates string sanitation logic before introducing Bleve query enhancements in subsequent commits.

**Files**:

- Modify: [`internal/search/query.go`](file:///path/to/internal/search/query.go)
- Create: [`internal/search/sanitize.go`](file:///path/to/internal/search/sanitize.go)
- Create: [`internal/search/sanitize_test.go`](file:///path/to/internal/search/sanitize_test.go)

**Diffs**:

```diff
--- a/internal/search/query.go
+++ b/internal/search/query.go
@@ -14,6 +14,8 @@ func BuildQuery(raw string) (*Query, error) {
-    cleaned := strings.TrimSpace(raw)
+    cleaned := SanitizeQuery(raw)
     return parse(cleaned)
 }
```

```diff
--- /dev/null
+++ b/internal/search/sanitize.go
@@ -0,0 +1,8 @@
+package search
+
+import "strings"
+
+func SanitizeQuery(input string) string {
+    return strings.TrimSpace(input)
+}
```

**Verification**:

```bash
go test ./internal/search/... -run TestSanitizeQuery
```
````

---

## 2. Execution Phase: Single-Commit-at-a-Time Rule

When executing on a multi-commit plan, the agent must adhere to the following workflow:

> [!IMPORTANT]
> **Strict Execution Constraint**: Complete and verify **ONLY ONE COMMIT AT A TIME**. Never batch or combine multiple commits in a single execution cycle.

### Per-Commit Execution Cycle

For each commit in sequence:

1. **Implement Changes**:
   - Apply only the edits, additions, and deletions specified for the current commit.
   - Do not make changes belonging to future commits prematurely.

2. **Run Verification**:
   - Execute the defined verification commands (tests, linter, compiler/typecheck).
   - Ensure all checks pass without errors.

3. **Stage and Commit**:
   - Stage the modified/added files:
     ```bash
     git add <file1> <file2>
     ```
   - Commit with the planned commit message:
     ```bash
     git commit -m "<commit-message>"
     ```

4. **Checkpoint & Progress Update**:
   - Provide a concise summary to the user indicating:
     - Which commit was just completed (with hash and message).
     - Verification command results.
     - What the next commit in the plan will be.
   - Proceed to the next commit.
