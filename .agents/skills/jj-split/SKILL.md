---
name: jj-split
description: Split a jj revision into multiple logical commits — whole-file via `jj split` filesets, or hunk-level via `jj-hunk`. Use when the user asks to split a commit, break up a change, separate unrelated work in `@`, or restructure a revision into smaller pieces. This repo uses jj, not git — never suggest `git add -p` or `git rebase -i` equivalents.
---

# jj split workflow

Turn one revision (usually `@`) into a stack of focused commits. Use `jj split` with filesets for whole-file groups; use `jj-hunk` for groups that need hunk-level granularity. Never invoke `jj split -i` or `--tool` interactively — Claude can't drive a TUI.

## Phase 1: Survey

Run in parallel:

- `jj log -r '::@' -n 5`
- `jj show -s @` (or `-r <rev>`)
- `jj diff -r @ --stat`

Substitute `@` with the user's target revision throughout if specified.

## Phase 2: Propose a grouping

Read diffs for any non-obvious file. Present a numbered plan, marking each group `whole-file` or `hunk-split`:

```
1. <message> — a.ts, b.ts                 [whole-file]
2. <message> — c.go                       [whole-file]
3. <message> — d.md (specific hunks)      [hunk-split]
4. <message> — d.md (rest), e.md          [remainder]
```

Rules:

- The **last** group is the remainder — it inherits the original description, so put the bulk there.
- Prefer whole-file when honest. Hunk-splits are more fragile.
- Each group should ideally compile on its own.

Wait for user confirmation.

## Phase 3a: Whole-file splits

For each whole-file group **except the last**:

```
jj split -r <rev> -m "<message>" <file1> <file2> ...
```

Positional args are jj filesets ("everything else stays in the remainder"). No `-i`. After each split, re-target subsequent splits at the new remainder (verify with `jj log`).

If the final remainder needs a different description:

```
jj describe -r <remainder> -m "<final message>"
```

## Phase 3b: Hunk-level splits with `jj-hunk`

### Recipe

1. **Inspect hunks** for the target revision:

   ```
   jj-hunk list -r <rev> --format json
   ```

   Each hunk has a stable `id` (`hunk-<sha256>`) and an `index`. Prefer `id`s — they survive reordering.

2. **Build a spec** selecting the hunks that go into the _first_ (selected) commit. Everything not selected falls to the remainder. Example:

   ```json
   {
     "files": {
       "src/d.md": { "ids": ["hunk-7c3d...", "hunk-9a2b..."] },
       "src/c.go": { "action": "keep" }
     },
     "default": "reset"
   }
   ```

   - `{"ids": [...]}` or `{"hunks": [indices|ids]}` — pick specific hunks
   - `{"action": "keep"}` — whole file goes to selected commit
   - `{"action": "reset"}` — whole file stays in remainder
   - `"default": "reset"` — unlisted files stay in remainder (almost always what you want)

3. **Split** (inline JSON, or `--spec-file path.json` for larger specs):

   ```
   jj-hunk split -r <rev> '<spec-json>' "<message>"
   ```

4. Repeat for each hunk-split group, re-targeting `<rev>` at the new remainder each time.

If `jj-hunk` reports the spec doesn't apply cleanly, **stop**. Re-propose a coarser grouping or hand that group back to the user.

## Phase 4: Verify

- `jj log -r '::@' -n 10` — stack matches the plan
- `jj diff --stat -r <each-new-rev>` — file counts match
- For hunk-splits, `jj diff --git -r <selected> -- <file>` — exactly the chosen hunks
- Total diff vs. the original parent should be unchanged

Report the resulting stack with change ids and one-line descriptions.

## Pitfalls

- **`jj op restore` is the undo button.** If a split goes wrong, `jj op log` then `jj op restore <op-id>`. Don't try to fix a broken stack by re-splitting.
- **Filesets ≠ shell globs.** Multiple paths are fine; for patterns use `'glob:src/**/*.ts'` (quoted).
- **Working copy snapshots automatically.** Unstaged edits get folded into `@` before any command. Run `jj status` first if unsure.
- **Empty commits can't be split** — use `jj new` instead.
- **Splitting immutable/pushed commits fails.** Surface the error, don't force.
- **Don't fall back to `git`** against the repo. This is a jj repo.
