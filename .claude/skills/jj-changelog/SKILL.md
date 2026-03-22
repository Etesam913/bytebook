---
name: jj-changelog
description: Generate a rich, structured changelog summarizing recent changes across the repo. Use when the user asks "what changed recently", "summarize recent work", "generate release notes", or needs to catch up on project activity. Also useful at the start of a conversation to build context.
---

# jj-changelog — Structured Change Summary

Generate a comprehensive, structured summary of recent repository changes using jj's template language and revsets. This gives agents and users fast context about what happened, when, by whom, and to which files.

## Step 1: Gather raw history

Run these commands to collect change data. Adjust the revset as needed (default: mutable changes not yet on trunk).

### Recent mutable changes (default view)

```bash
jj log --no-pager -r 'mutable()' --no-graph -T '
  separate("\n",
    "=== CHANGE " ++ change_id.shortest(8) ++ " (" ++ commit_id.short(10) ++ ") ===",
    "Author:  " ++ author.name() ++ " <" ++ author.email() ++ ">",
    "Date:    " ++ author.timestamp().local().format("%Y-%m-%d %H:%M"),
    "Age:     " ++ author.timestamp().ago(),
    "Empty:   " ++ if(empty, "yes", "no"),
    "Conflict:" ++ if(conflict, " YES — needs resolution", " none"),
    surround("Bookmarks: ", "", bookmarks.map(|b| b.name()).join(", ")),
    surround("Tags: ", "", tags.map(|t| t.name()).join(", ")),
    "Description: " ++ coalesce(description.first_line(), "(no description)"),
    ""
  ) ++ "\n"
'
```

### File-level diff stats for those changes

```bash
jj log --no-pager -r 'mutable()' --no-graph -T '
  "--- " ++ change_id.shortest(8) ++ " ---\n"
  ++ diff.stat(72)
  ++ "\n"
'
```

### Changes in a specific time window (last 7 days)

```bash
jj log --no-pager -r 'author_date(after:"7 days ago") & mutable()' --no-graph -T '
  change_id.shortest(8) ++ " | "
  ++ author.timestamp().local().format("%m-%d %H:%M") ++ " | "
  ++ pad_end(20, author.name()) ++ " | "
  ++ coalesce(description.first_line(), "(empty)") ++ "\n"
'
```

### Changes touching specific file patterns (e.g., only frontend)

```bash
jj log --no-pager -r 'mutable() & files(glob:"frontend/src/**")' --no-graph -T '
  change_id.shortest(8) ++ " " ++ coalesce(description.first_line(), "(empty)") ++ "\n"
'
```

### Changes touching specific file patterns (e.g., only backend)

```bash
jj log --no-pager -r 'mutable() & files(glob:"internal/**")' --no-graph -T '
  change_id.shortest(8) ++ " " ++ coalesce(description.first_line(), "(empty)") ++ "\n"
'
```

## Step 2: Identify hotspots and conflicts

```bash
# Any unresolved conflicts?
jj log --no-pager -r 'mutable() & conflicts()' --no-graph -T '
  "CONFLICT: " ++ change_id.shortest(8) ++ " — " ++ coalesce(description.first_line(), "(no desc)") ++ "\n"
'
```

## Step 3: Synthesize

Using the collected data, produce a structured changelog in this format:

```markdown
## Changelog — [date range]

### Summary

- **X** changes across **Y** files
- **Conflicts**: [list or "none"]
- **Active areas**: [top directories/modules by change frequency]

### Changes (newest first)

| Change | Date | Author | Description |
| ------ | ---- | ------ | ----------- |
| ...    | ...  | ...    | ...         |

### Hotspots

Files or directories with the most modifications across these changes.

### Notes

Any conflicts, divergent changes, or empty commits that need attention.
```

## Tips

- To scope to a different range, replace `mutable()` with any revset: `@::`, `bookmarks("feature-x")::@`, `author_date(after:"2025-01-01")`, etc.
- Add `& mine()` to filter to only the current user's changes.
- Use `& files(glob:"**/*.go")` to limit to specific file types.
- For trunk-based summaries: `trunk()..@` shows work since diverging from trunk.
