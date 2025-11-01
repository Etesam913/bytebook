interface SearchResultsHeaderProps {
  searchQuery: string;
  resultCount: number;
}

export function SearchResultsHeader({
  searchQuery,
  resultCount,
}: SearchResultsHeaderProps) {
  const trimmedQuery = searchQuery.trim();
  const resultLabel = resultCount === 1 ? 'result' : 'results';

  if (!trimmedQuery) {
    return null;
  }

  return (
    <div className="flex items-center justify-between text-sm gap-2 pl-2  py-1">
      <span className="text-zinc-600 dark:text-zinc-400">
        {resultCount} {resultLabel} for{' '}
        <span className="font-code">{trimmedQuery}</span>
      </span>
    </div>
  );
}
