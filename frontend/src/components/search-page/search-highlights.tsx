import { HighlightResult } from '../../../bindings/github.com/etesam913/bytebook/internal/search/models';
import { SearchCodeBlock } from './search-code-block';

export function SearchHighlights({
  highlights,
}: {
  highlights?: HighlightResult[];
}) {
  if ((highlights?.length ?? 0) === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {(highlights ?? []).slice(0, 3).map((highlight, idx) =>
        highlight.isCode ? (
          <SearchCodeBlock key={idx} content={highlight.content} />
        ) : (
          <div
            key={idx}
            className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: highlight.content,
            }}
          />
        )
      )}
    </div>
  );
}
