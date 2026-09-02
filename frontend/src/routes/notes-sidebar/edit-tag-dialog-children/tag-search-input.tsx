import { AppSearchField } from '@components/input';

/**
 * Text input used inside the Edit Tags dialog for filtering the tag list and
 * for creating new tags. Pressing Enter on a non-empty query creates a new
 * tag with that name. Renders nothing while the tags query is loading or
 * errored.
 */
export function TagSearchInput({
  searchTerm,
  onSearchTermChange,
  onCreateTag,
  isLoading,
  hasError,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onCreateTag: (tagName: string) => void;
  isLoading: boolean;
  hasError: boolean;
}) {
  if (isLoading || hasError) {
    return null;
  }

  return (
    <div className="mb-2">
      <AppSearchField
        autoFocus
        placeholder="Search tags or create new tag..."
        value={searchTerm}
        onChange={onSearchTermChange}
        inputClassName="text-sm"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck="false"
        type="text"
        onSubmit={(value) => {
          const tagName = value.trim();
          if (tagName.length > 0) onCreateTag(tagName);
        }}
      />
    </div>
  );
}
