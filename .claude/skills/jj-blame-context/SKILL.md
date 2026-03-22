---
name: jj-blame-context
description: Deep history analysis for specific files or code regions. Use when investigating why code exists, who wrote it, when it last changed, or to trace the evolution of a file. Helpful for debugging ("when did this break?"), code review ("why is this here?"), and onboarding ("what's the story behind this module?").
---

# jj-blame-context — File & Code Archaeology

Trace the history and authorship of specific files or code regions using jj's revsets, filesets, and templates.

## Step 1: File-level history

Get the full change history for a target file:

```bash
# All changes that touched a specific file
jj log --no-pager -r 'all() & files("PATH_TO_FILE")' --no-graph -T '
  separate(" | ",
    change_id.shortest(8),
    author.timestamp().local().format("%Y-%m-%d"),
    author.timestamp().ago(),
    pad_end(16, author.name()),
    coalesce(description.first_line(), "(no description)")
  ) ++ "\n"
'
```

```bash
# Show the actual diffs for each change to that file
jj log --no-pager -r 'all() & files("PATH_TO_FILE")' --no-graph -T '
  "=== " ++ change_id.shortest(8) ++ " by " ++ author.name() ++ " (" ++ author.timestamp().ago() ++ ") ===\n"
  ++ description.first_line() ++ "\n"
  ++ diff(glob:"PATH_TO_FILE").stat(72)
  ++ "\n"
'
```

## Step 2: Line-level blame

Use `jj file annotate` (jj's blame equivalent) to see who last modified each line:

```bash
jj file annotate PATH_TO_FILE
```

To understand a specific region, pipe through line filtering:

```bash
# Lines 50-80 of a file
jj file annotate PATH_TO_FILE | awk 'NR>=50 && NR<=80'
```

## Step 3: Search for when specific code appeared

Use `diff_lines` to find which change introduced a specific pattern:

```bash
# Find when a specific function/string was added
jj log --no-pager -r 'all() & diff_lines("SEARCH_PATTERN", glob:"PATH_TO_FILE")' --no-graph -T '
  change_id.shortest(8) ++ " | "
  ++ author.timestamp().local().format("%Y-%m-%d") ++ " | "
  ++ author.name() ++ " | "
  ++ coalesce(description.first_line(), "(no desc)") ++ "\n"
'
```

```bash
# See the actual diff containing the pattern
jj log --no-pager -r 'all() & diff_lines("SEARCH_PATTERN", glob:"PATH_TO_FILE")' --no-graph -T '
  "=== " ++ change_id.shortest(8) ++ " ===\n"
  ++ diff(glob:"PATH_TO_FILE").color_words()
  ++ "\n"
'
```

## Step 4: Co-change analysis

Find files that frequently change together with the target:

```bash
# For each change that touched the target file, show ALL files changed
jj log --no-pager -r 'mutable() & files("PATH_TO_FILE")' --no-graph -T '
  "--- " ++ change_id.shortest(8) ++ " ---\n"
  ++ diff.stat(72)
  ++ "\n"
'
```

## Step 5: Author analysis

Who has contributed the most to this file?

```bash
jj log --no-pager -r 'all() & files("PATH_TO_FILE")' --no-graph -T '
  author.name() ++ "\n"
' | sort | uniq -c | sort -rn
```

## Synthesize

Present findings as:

```markdown
## File History: `path/to/file`

### Overview
- **Created**: [date] by [author] in change [id]
- **Last modified**: [date] by [author] in change [id]
- **Total changes**: N
- **Primary authors**: [list with counts]

### Timeline
| Change | Date | Author | Summary |
|--------|------|--------|---------|
| ... | ... | ... | ... |

### Key Events
- [date]: [significant change — e.g., major refactor, bug fix, feature addition]

### Co-changed Files
Files that frequently change alongside this one (suggests coupling).
```

## Tips

- Replace `all()` with `mutable()` or a date range to limit scope.
- Use `& ~empty()` to skip empty/merge changes.
- For a directory: use `files(glob:"src/components/editor/**")` as the fileset.
- To trace a renamed file, look for changes where the old path was deleted and the new path was added.
