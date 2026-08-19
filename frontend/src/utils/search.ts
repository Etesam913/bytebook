// Expands "a/b/c.md" into its ancestor directories ("a/", "a/b/") so a
// backend-filtered file list gains the explicit directory entries the
// GetAllPaths convention (trailing slash) provides.
export function addAncestorDirectoryPaths(paths: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const path of paths) {
    const segments = path.split('/').filter(Boolean);
    for (let i = 1; i < segments.length; i++) {
      const dir = `${segments.slice(0, i).join('/')}/`;
      if (!seen.has(dir)) {
        seen.add(dir);
        result.push(dir);
      }
    }
    if (!seen.has(path)) {
      seen.add(path);
      result.push(path);
    }
  }
  return result;
}
