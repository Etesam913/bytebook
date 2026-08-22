import {
  SEARCH_HELP_SECTIONS,
  SearchHelpSections,
} from '@components/search-help';

export function SearchSidebarHelp() {
  return (
    <div className="px-3 py-2 flex flex-col gap-3 overflow-y-auto">
      <h3 className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
        Examples
      </h3>
      <SearchHelpSections sections={SEARCH_HELP_SECTIONS} />
    </div>
  );
}
