---
name: jj-split
description: Split a jj revision into multiple logical commits using filesets (non-interactive). Use when the user asks to split a commit, break up a change, separate unrelated work in `@`, or stack/restructure a revision into smaller pieces. This repo uses jj, not git — never suggest `git add -p` or `git rebase -i` equivalents.
---

# jj split workflow

Goal: turn one revision (usually `@`) containing several unrelated changes into a stack of focused commits, **without** invoking the interactive TUI diff editor (which Claude cannot drive).

## Phase 1: Survey the revision

Run these in parallel before proposing any split:

- `jj log -r '::@' -n 5` — context for the surrounding stack
- `jj show -s @` (or `-r <rev>`) — list of changed files + summary
- `jj diff -r @ --stat` — per-file size, helps prioritize grouping

If the user named a different revision, substitute it for `@` everywhere below.

## Phase 2: Propose a grouping

Read the diff for any file that isn't obviously self-contained. Then present a numbered plan:

```
Proposed split of <change-id>:

1. <message> — files: a.ts, b.ts
2. <message> — files: c.go
3. <message> — files: d.md, e.md  (remainder)
```

Rules for grouping:

- Each group should compile / pass tests on its own when possible.
- Keep refactors separate from behavior changes.
- The **last** group is the "remainder" — it inherits the original description, so put the bulk / least-interesting changes there.
- If a single file contains two unrelated hunks, call it out — fileset-based split cannot separate hunks within a file. Options: (a) accept coarser grouping, (b) tell the user this group needs interactive split done by them.

Wait for user confirmation before mutating the repo.

## Phase 3: Execute the split

For each group **except the last**, run:

```
jj split -r <rev> -m "<commit message>" <file1> <file2> ...
```

After each split, the "remaining" commit becomes the new `@` (or keeps the original change id at the tip of the chain — verify with `jj log`). Re-target subsequent splits at that remainder.

Key flags:

- Positional filesets → selected into the **first** (child) commit; everything else stays in the remainder. No `-i` needed when filesets are given.
- `-m "..."` → description for the selected commit; the remainder keeps the original description. Use this every time to avoid `$EDITOR` opening.
- `-p` → parallel siblings instead of parent/child. Default (no `-p`) is usually what the user wants.
- `-r <revset>` → split a non-`@` revision. Splits of immutable/pushed commits will fail; surface the error rather than forcing.

The final group needs no command — it's whatever remains after the previous splits. Update its description if needed:

```
jj describe -r <remainder> -m "<final message>"
```

## Phase 4: Verify

Run `jj log -r '::@' -n 10` and `jj diff --stat -r <each-new-rev>` to confirm:

- File counts per commit match the plan
- No commit is empty (`jj abandon` it if so)
- Total diff vs. original revision is unchanged — `jj diff --from <original-parent> --to @ --stat` should equal the pre-split stat

Report the resulting stack to the user with change ids and one-line descriptions.

## Pitfalls

- **Filesets are jj filesets, not shell globs.** Multiple paths work as positional args; for patterns use `'glob:src/**/*.ts'` (quoted).
- **Conflicts after split:** rare with file-level splits, but if jj reports conflicts in descendants, stop and show `jj status` — do not auto-resolve.
- **Working copy snapshot:** jj snapshots `@` automatically before each command. If the user has unstaged edits they didn't mention, they'll be folded into `@` and split along with everything else. Run `jj status` first if in doubt.
- **Don't fall back to git.** This repo uses jj. If `jj split` fails, diagnose the jj error; never reach for `git` commands as a workaround.
