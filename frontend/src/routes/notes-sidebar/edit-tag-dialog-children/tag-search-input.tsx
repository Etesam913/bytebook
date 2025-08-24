import { Input } from '../../../components/input';

export function TagSearchInput({
  searchTerm,
  onSearchTermChange,
  onCreateTag,
  isLoading,
  hasError,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onCreateTag: (tagName: string) => Promise<void>;
  isLoading: boolean;
  hasError: boolean;
}) {
  if (isLoading || hasError) {
    return null;
  }

  return (
    <div className="mb-2">
      <Input
        labelProps={{}}
        inputProps={{
          autoFocus: true,
          placeholder: 'Search tags or create new tag...',
          value: searchTerm,
          onChange: (e) => onSearchTermChange(e.target.value),
          className: 'text-sm',
          autoCapitalize: 'off',
          autoComplete: 'off',
          spellCheck: 'false',
          type: 'text',
          onKeyDown: async (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (searchTerm.length > 0) {
                await onCreateTag(searchTerm);
              }
            }
          },
        }}
        clearable={true}
      />
    </div>
  );
}
