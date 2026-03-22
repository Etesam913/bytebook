---
name: jj-review
description: Rich code review of working copy or any revision. Use when the user asks to "review my changes", "check what I've done", "look at the diff", or before committing. Provides structured feedback on code quality, potential bugs, and style issues by combining jj diff output with analysis.
---

# jj-review — Structured Code Review

Perform a thorough code review of changes in any jj revision using templates, revsets, and filesets to gather context, then analyze the diffs.

## Step 1: Identify what to review

```bash
# Working copy status (uncommitted changes)
jj status
```

```bash
# Overview of the change(s) to review
jj log --no-pager -r 'REVSET' --no-graph -T '
  separate("\n",
    "Change:      " ++ change_id.shortest(8) ++ " (" ++ commit_id.short(10) ++ ")",
    "Author:      " ++ author.name() ++ " <" ++ author.email() ++ ">",
    "Date:        " ++ author.timestamp().local().format("%Y-%m-%d %H:%M") ++ " (" ++ author.timestamp().ago() ++ ")",
    "Empty:       " ++ if(empty, "yes (no file changes)", "no"),
    "Conflict:    " ++ if(conflict, "YES", "none"),
    "Parents:     " ++ parents.map(|p| p.change_id().shortest(8)).join(", "),
    surround("Bookmarks:   ", "", bookmarks.map(|b| b.name()).join(", ")),
    "Description: " ++ coalesce(description, "(no description)"),
    ""
  ) ++ "\n"
'
```

Replace `REVSET` with `@` for working copy, a change ID, or any revset expression.

## Step 2: Get the diff summary and stats

```bash
# High-level: which files changed and how
jj diff -r 'REVSET' --summary
```

```bash
# Line-level stats
jj log --no-pager -r 'REVSET' --no-graph -T '
  diff.stat(80)
'
```

## Step 3: Get the full diff

```bash
# Full word-level diff (best for review)
jj diff -r 'REVSET'
```

For large changes, scope to specific areas:

```bash
# Only frontend changes
jj diff -r 'REVSET' glob:'frontend/src/**'

# Only backend changes
jj diff -r 'REVSET' glob:'internal/**'

# Only test files
jj diff -r 'REVSET' glob:'**/*_test.*' glob:'**/*.test.*' glob:'**/*.spec.*'

# Exclude generated files
jj diff -r 'REVSET' '~glob:frontend/bindings/**'
```

## Step 4: Check parent context

Understanding the parent(s) helps evaluate the change in context:

```bash
# What was the parent doing?
jj log --no-pager -r 'REVSET-' --no-graph -T '
  "Parent: " ++ change_id.shortest(8) ++ "\n"
  ++ coalesce(description, "(no description)") ++ "\n"
'
```

```bash
# Is there a merge? Check all parents
jj log --no-pager -r 'parents(REVSET)' --no-graph -T '
  change_id.shortest(8) ++ " — " ++ coalesce(description.first_line(), "(no desc)") ++ "\n"
'
```

## Step 5: Review checklist

Analyze the diff with this checklist:

### Code Quality
- [ ] Functions/methods have clear, single responsibilities
- [ ] No dead code or commented-out blocks
- [ ] Error handling is present where needed
- [ ] No hardcoded values that should be constants/config

### Correctness
- [ ] Edge cases handled (empty arrays, null/undefined, zero values)
- [ ] State mutations are intentional and safe
- [ ] Async operations handle errors and cleanup
- [ ] No off-by-one errors in loops/slices

### Bytebook-Specific
- [ ] Backend responses use `BackendResponseWithData[T]` / `BackendResponseWithoutData`
- [ ] Event names use constants from `internal/util/events.go`
- [ ] File paths use `createFilePath()` / `createFolderPath()` (not raw strings or `LocalFilePath`)
- [ ] No `useCallback` / `useMemo` (react-compiler handles this)
- [ ] Functions with 3+ params use object parameter pattern
- [ ] Atoms use `atomWithLogging` wrapper

### Security
- [ ] No user input passed unsanitized to shell commands or file paths
- [ ] No credentials or secrets in the diff
- [ ] File operations validate paths are within expected directories

## Step 6: Present the review

```markdown
## Code Review: [change_id] — [description first line]

### Overview
- **Files**: N modified, M added, P deleted
- **Lines**: +X / -Y
- **Scope**: [frontend/backend/both]

### Findings

#### Issues (must fix)
1. **[file:line]** — [description of the problem and suggested fix]

#### Suggestions (nice to have)
1. **[file:line]** — [description and rationale]

#### Positive Notes
- [Things done well worth calling out]

### Verdict
[LGTM / Needs changes / Needs discussion]
```

## Tips

- Use `jj diff -r 'REVSET' --git` for git-format diffs if word-level is too noisy.
- For reviewing a stack: `jj log --no-pager -r 'trunk()..@' --no-graph -T '...'` to see all changes, then review each one.
- To compare two specific revisions: `jj diff --from REV1 --to REV2`.
