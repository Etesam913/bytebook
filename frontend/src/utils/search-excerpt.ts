// Decode text entities after splitting highlight wrappers, so escaped markup stays text.
function decodeText(text: string): string {
  return text.replace(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (entity: string, code: string) => {
      const named: Record<string, string> = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
      };
      if (!code.startsWith('#')) return named[code.toLowerCase()] ?? entity;
      const value = code.toLowerCase().startsWith('#x')
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10);
      return value > 0 && value <= 0x10ffff
        ? String.fromCodePoint(value)
        : entity;
    }
  );
}

export function parseSearchExcerpt(html: string) {
  let depth = 0;
  return html.split(/(<\/?(?:mark|em)>)/gi).flatMap((part) => {
    if (/^<(mark|em)>$/i.test(part)) {
      depth++;
      return [];
    }
    if (/^<\/(mark|em)>$/i.test(part)) {
      depth = Math.max(0, depth - 1);
      return [];
    }
    return part ? [{ text: decodeText(part), highlighted: depth > 0 }] : [];
  });
}
