// Mirrors the token shapes recognized by internal/search/tokens.go. Only
// detects *whether* filter syntax is present — parsing stays backend-side.
const PREFIX_PATTERN = /^(file|f|type|t|lang|l|sort|s):/i;

export function queryHasFilterSyntax(query: string): boolean {
  if (query.includes('"')) return true;
  return query.split(/\s+/).some((token) => {
    if (token.length === 0) return false;
    if (PREFIX_PATTERN.test(token)) return true;
    // Prefix position only — "me@x" or "c#" mid-token stays a plain filter.
    if (token.startsWith('#') || token.startsWith('@')) return true;
    if (token.startsWith('-') && token.length > 1) return true;
    // Uppercase-only on purpose (stricter than the backend's case-insensitive
    // operators): "fish and chips" should stay a local substring filter.
    return token === 'AND' || token === 'OR' || token === '&&' || token === '||';
  });
}

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
