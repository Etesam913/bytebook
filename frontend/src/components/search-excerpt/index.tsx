import { parseSearchExcerpt } from '@utils/search-excerpt';

// Shared by Quick Open and the @ file picker to render highlights without injecting
// HTML and trim long prefixes so the first match stays visible in compact rows.
export function SearchExcerpt({ html }: { html: string }) {
  const parts = parseSearchExcerpt(html);
  const firstMatch = parts.findIndex((part) => part.highlighted);
  return parts.map((part, index) => {
    const text =
      index === firstMatch - 1 && part.text.length > 60
        ? `…${part.text.slice(-60)}`
        : part.text;
    return part.highlighted ? <mark key={index}>{text}</mark> : text;
  });
}
