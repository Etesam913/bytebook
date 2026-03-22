---
name: jj-impact-analysis
description: Analyze the blast radius and coupling of a set of changes. Use before merging, reviewing, or refactoring to understand what areas of the codebase are affected, which modules are coupled, and whether changes are safe to land. Also useful for "what would break if I change X?" questions.
---

# jj-impact-analysis — Change Blast Radius & Coupling

Analyze how changes ripple through the codebase. Combines revsets, filesets, and templates to map affected areas, detect coupling, and flag risks.

## Step 1: Scope the changes

Define the revset for the changes under analysis. Common choices:

```bash
# Working copy changes
REVSET="@"

# All mutable work
REVSET="mutable()"

# A specific feature branch
REVSET="trunk()..@"

# A single change
REVSET="CHANGE_ID"
```

## Step 2: Map affected files and directories

```bash
# Full file list with change status
jj log --no-pager -r 'REVSET' --no-graph -T '
  diff.summary()
'
```

```bash
# Diff stats — lines added/removed per file
jj log --no-pager -r 'REVSET' --no-graph -T '
  diff.stat(80)
'
```

```bash
# Aggregate: which top-level directories are touched?
jj log --no-pager -r 'REVSET' --no-graph -T '
  diff.files().map(|entry|
    entry.path().display() ++ "\n"
  ).join("")
' | sed 's|/.*||' | sort | uniq -c | sort -rn
```

## Step 3: Cross-boundary analysis

Identify if changes span multiple architectural boundaries:

```bash
# Frontend-only changes
jj log --no-pager -r 'REVSET & files(glob:"frontend/**")' --no-graph -T '
  change_id.shortest(8) ++ ": " ++ diff(glob:"frontend/**").stat(60) ++ "\n"
'
```

```bash
# Backend-only changes
jj log --no-pager -r 'REVSET & files(glob:"internal/**")' --no-graph -T '
  change_id.shortest(8) ++ ": " ++ diff(glob:"internal/**").stat(60) ++ "\n"
'
```

```bash
# Changes that touch BOTH frontend and backend (cross-cutting)
jj log --no-pager -r 'REVSET & files(glob:"frontend/**") & files(glob:"internal/**")' --no-graph -T '
  "CROSS-CUTTING: " ++ change_id.shortest(8) ++ " — " ++ coalesce(description.first_line(), "(no desc)") ++ "\n"
  ++ diff.stat(72) ++ "\n"
'
```

## Step 4: Binding surface analysis

Changes to Wails service bindings affect both Go and TypeScript. Check if bindings were regenerated:

```bash
# Changes to Go service files
jj log --no-pager -r 'REVSET & files(glob:"internal/services/**")' --no-graph -T '
  change_id.shortest(8) ++ " touches services:\n" ++ diff(glob:"internal/services/**").summary() ++ "\n"
'
```

```bash
# Changes to generated bindings
jj log --no-pager -r 'REVSET & files(glob:"frontend/bindings/**")' --no-graph -T '
  change_id.shortest(8) ++ " touches bindings:\n" ++ diff(glob:"frontend/bindings/**").summary() ++ "\n"
'
```

## Step 5: Risk indicators

```bash
# Large changes (potential risk)
jj log --no-pager -r 'REVSET & ~empty()' --no-graph -T '
  let stats = diff.stat(0);
  if(stats.total_added() + stats.total_removed() > 100,
    "LARGE: " ++ change_id.shortest(8)
    ++ " (+" ++ stringify(stats.total_added()) ++ " -" ++ stringify(stats.total_removed()) ++ ") "
    ++ coalesce(description.first_line(), "(no desc)") ++ "\n",
    ""
  )
'
```

```bash
# Conflicting changes
jj log --no-pager -r 'REVSET & conflicts()' --no-graph -T '
  "CONFLICT: " ++ change_id.shortest(8) ++ " — " ++ coalesce(description.first_line(), "") ++ "\n"
'
```

```bash
# Empty commits (possibly squashed or WIP)
jj log --no-pager -r 'REVSET & empty()' --no-graph -T '
  "EMPTY: " ++ change_id.shortest(8) ++ " — " ++ coalesce(description.first_line(), "(no description)") ++ "\n"
'
```

## Step 6: Event and atom analysis (Bytebook-specific)

Check if event constants or atom definitions changed:

```bash
# Event constant changes
jj log --no-pager -r 'REVSET & files("internal/util/events.go")' --no-graph -T '
  "EVENT CHANGES in " ++ change_id.shortest(8) ++ ":\n"
  ++ diff(file:"internal/util/events.go").color_words()
  ++ "\n"
'
```

```bash
# Atom changes
jj log --no-pager -r 'REVSET & files("frontend/src/atoms.ts")' --no-graph -T '
  "ATOM CHANGES in " ++ change_id.shortest(8) ++ ":\n"
  ++ diff(file:"frontend/src/atoms.ts").color_words()
  ++ "\n"
'
```

## Synthesize

Present the analysis as:

```markdown
## Impact Analysis: [revset description]

### Scope
- **Changes analyzed**: N
- **Files affected**: N (M added, P modified, Q deleted)
- **Lines**: +X / -Y

### Affected Areas
| Area | Files Changed | Lines +/- | Notes |
|------|--------------|-----------|-------|
| Frontend components | ... | ... | ... |
| Backend services | ... | ... | ... |
| Bindings (generated) | ... | ... | ... |
| Tests | ... | ... | ... |

### Cross-Cutting Changes
Changes that span multiple boundaries (higher review priority).

### Risk Flags
- [ ] Large diffs (>100 lines)
- [ ] Unresolved conflicts
- [ ] Service interface changes without binding updates
- [ ] Event constant changes (requires frontend/backend coordination)
- [ ] Empty/WIP commits

### Recommendations
[Actionable suggestions: split large changes, resolve conflicts, regenerate bindings, etc.]
```
