/**
 * Builds a map of tag name → number of selected notes that have that tag.
 * A count equal to the total number of selected notes means every selected
 * note has the tag; anything in between represents partial selection.
 */
export function buildBaseTagCounts(
  tagsForSelectedNotes:
    | Record<string, readonly string[] | undefined>
    | undefined
    | null
) {
  const tagCounts = new Map<string, number>();

  if (!tagsForSelectedNotes) {
    return tagCounts;
  }

  Object.values(tagsForSelectedNotes).forEach((noteTags) => {
    (noteTags ?? []).forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  return tagCounts;
}

/**
 * Produces a stable string key representing a tag counts map. Used to detect
 * when the server-derived base counts have changed so stale user overrides
 * can be dropped.
 */
export function createTagCountsKey(tagCounts: Map<string, number>) {
  const entries = Array.from(tagCounts.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return JSON.stringify(entries);
}

/**
 * Returns a new map composed of the base tag counts with the user's override
 * entries layered on top.
 */
export function mergeTagCounts(
  base: Map<string, number>,
  overrides: Map<string, number>
) {
  const merged = new Map(base);
  overrides.forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
}
