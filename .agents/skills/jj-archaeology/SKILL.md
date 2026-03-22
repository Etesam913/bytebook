---
name: jj-archaeology
description: Dig through repo history to answer "when did this break?", "who introduced this pattern?", "when was this removed?", or "how has this area evolved?". Use for root-cause investigation, understanding design decisions, or tracing the origin of bugs and patterns across time.
---

# jj-archaeology — Deep History Investigation

Systematically search through repository history to answer questions about when, why, and how code changed. Combines `diff_lines`, `description`, `author`, and time-based revsets with templates for structured output.

## Investigation Patterns

### Pattern 1: "When did this break?" — Find when a line/pattern was introduced or removed

```bash
# Find changes that added a specific pattern
jj log --no-pager -r 'all() & diff_lines("PATTERN")' --no-graph -T '
  separate(" | ",
    change_id.shortest(8),
    author.timestamp().local().format("%Y-%m-%d %H:%M"),
    author.name(),
    coalesce(description.first_line(), "(no desc)")
  ) ++ "\n"
'
```

```bash
# Narrow to a specific file
jj log --no-pager -r 'all() & diff_lines("PATTERN", glob:"path/to/file")' --no-graph -T '
  change_id.shortest(8) ++ " " ++ author.timestamp().local().format("%Y-%m-%d") ++ "\n"
  ++ diff(glob:"path/to/file").color_words()
  ++ "\n"
'
```

```bash
# Find when a pattern was removed (look for it in diff lines — removal shows as diff too)
jj log --no-pager -r 'all() & diff_lines("REMOVED_PATTERN")' --no-graph -T '
  change_id.shortest(8) ++ " | " ++ author.timestamp().ago() ++ " | "
  ++ coalesce(description.first_line(), "(no desc)") ++ "\n"
'
```

### Pattern 2: "How did this file evolve?" — Full file timeline

```bash
# Complete timeline for a file with descriptions and stats
jj log --no-pager -r 'all() & files("PATH_TO_FILE") & ~empty()' --no-graph -T '
  separate("\n",
    "--- " ++ change_id.shortest(8) ++ " (" ++ author.timestamp().local().format("%Y-%m-%d") ++ ") ---",
    "Author: " ++ author.name(),
    "Desc:   " ++ coalesce(description.first_line(), "(no description)"),
    diff(file:"PATH_TO_FILE").stat(60),
    ""
  ) ++ "\n"
'
```

```bash
# Show word-level diffs for each change to see exactly what evolved
jj log --no-pager -r 'all() & files("PATH_TO_FILE") & ~empty()' --no-graph -T '
  "========== " ++ change_id.shortest(8) ++ " by " ++ author.name()
  ++ " (" ++ author.timestamp().ago() ++ ") ==========\n"
  ++ coalesce(description.first_line(), "(no desc)") ++ "\n\n"
  ++ diff(file:"PATH_TO_FILE").color_words()
  ++ "\n"
'
```

### Pattern 3: "Who knows about this area?" — Find domain experts

```bash
# Top contributors to a directory
jj log --no-pager -r 'all() & files(glob:"DIRECTORY/**") & ~empty()' --no-graph -T '
  author.name() ++ "\n"
' | sort | uniq -c | sort -rn | head -10
```

```bash
# Recent contributors with their changes
jj log --no-pager -r 'author_date(after:"90 days ago") & files(glob:"DIRECTORY/**") & ~empty()' --no-graph -T '
  separate(" | ",
    pad_end(16, author.name()),
    author.timestamp().local().format("%Y-%m-%d"),
    coalesce(description.first_line(), "(no desc)")
  ) ++ "\n"
'
```

### Pattern 4: "What was the intent?" — Trace design decisions through commit messages

```bash
# Search commit descriptions for keywords
jj log --no-pager -r 'all() & description(substring:"KEYWORD")' --no-graph -T '
  separate("\n",
    "--- " ++ change_id.shortest(8) ++ " (" ++ author.timestamp().local().format("%Y-%m-%d") ++ ") ---",
    "Author: " ++ author.name(),
    description,
    ""
  ) ++ "\n"
'
```

```bash
# Find changes mentioning a bug/issue number
jj log --no-pager -r 'all() & description(regex:"#\\d+")' --no-graph -T '
  change_id.shortest(8) ++ " | " ++ coalesce(description.first_line(), "") ++ "\n"
'
```

### Pattern 5: "What changed between two points?" — Diff between revisions

```bash
# Summary of all changes between two revisions
jj diff --from REV1 --to REV2 --summary
```

```bash
# All commits between two points with details
jj log --no-pager -r 'REV1::REV2' --no-graph -T '
  separate(" | ",
    change_id.shortest(8),
    author.timestamp().local().format("%Y-%m-%d"),
    author.name(),
    coalesce(description.first_line(), "(no desc)")
  ) ++ "\n"
'
```

### Pattern 6: "Find related changes" — Changes near a known event

```bash
# Changes by the same author around the same time
jj log --no-pager -r 'author(substring:"AUTHOR_NAME") & author_date(after:"DATE_START") & author_date(before:"DATE_END")' --no-graph -T '
  change_id.shortest(8) ++ " | "
  ++ author.timestamp().local().format("%Y-%m-%d %H:%M") ++ " | "
  ++ coalesce(description.first_line(), "(no desc)") ++ "\n"
'
```

```bash
# Siblings: other changes with the same parent (parallel work)
jj log --no-pager -r 'children(parents(CHANGE_ID)) ~ CHANGE_ID' --no-graph -T '
  change_id.shortest(8) ++ " — " ++ coalesce(description.first_line(), "(no desc)") ++ "\n"
'
```

### Pattern 7: Bisection support

```bash
# Get the optimal commit to test next
jj log --no-pager -r 'bisect(GOOD_REV::BAD_REV)' --no-graph -T '
  "Test this: " ++ change_id.shortest(8) ++ " (" ++ commit_id.short(10) ++ ")\n"
  ++ "Date: " ++ author.timestamp().local().format("%Y-%m-%d %H:%M") ++ "\n"
  ++ "Desc: " ++ coalesce(description.first_line(), "(no desc)") ++ "\n"
'
```

## Synthesize

Present findings as a narrative:

```markdown
## Investigation: [question being answered]

### Timeline
[Chronological sequence of relevant changes with links to change IDs]

### Key Finding
[The answer to the question, supported by evidence from the history]

### Evidence
| Change | Date | Author | Relevance |
|--------|------|--------|-----------|
| ... | ... | ... | ... |

### Context
[Additional changes or patterns that help explain the finding]
```

## Tips

- `all()` searches ALL history (including hidden commits referenced by ID). Use `mutable()` or date ranges to limit scope for performance.
- Combine patterns: `diff_lines("pattern") & files(glob:"dir/**") & author_date(after:"2025-01-01")` for very targeted searches.
- If a search returns too many results, add `& author_date(after:"...")` or narrow the fileset.
- Use `jj file annotate FILE | grep "PATTERN"` for quick "who last touched this line" queries.
