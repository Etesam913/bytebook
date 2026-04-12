import { type RefCallback, useState } from 'react';
import { RouteFallback } from '../../../components/route-fallback';
import { useTagsForNotesQuery, useTagsQuery } from '../../../hooks/tags';
import { MotionButton } from '../../../components/buttons';
import { getDefaultButtonVariants } from '../../../animations';
import { TagPlus } from '../../../icons/tag-plus';
import { DialogErrorText } from '../../../components/dialog';
import { TagSearchInput } from './tag-search-input';
import { SelectedTagsDisplay } from './selected-tags-display';
import { TagSelectionList } from './tag-selection-list';

/**
 * Dialog body for editing tags across one or more selected notes. Renders the
 * search input, selection list, and currently-selected tag chips, and emits
 * the final add/remove tag lists through hidden form inputs so the parent
 * Dialog's Form action can submit them as FormData.
 */
export function EditTagDialogChildren({
  selectionRange,
  folder,
  errorText,
}: {
  selectionRange: Set<string>;
  folder: string;
  errorText: string;
}) {
  const [tagsCreatedButNotSaved, setTagsCreatedButNotSaved] = useState<
    string[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: allTags,
    isLoading: areTagsLoading,
    isError: areTagsError,
    error: tagsError,
  } = useTagsQuery();

  // Getting the notes that were selected to open this dialog
  const selectedFilePaths = [...selectionRange]
    .filter((selectionRangeEntry) => selectionRangeEntry.startsWith('note:'))
    .map((selectionRangeEntry) => {
      const note = selectionRangeEntry.split(':')[1];
      return `${folder}/${note}`;
    });

  const totalSelectedNotes = selectedFilePaths.length;

  const {
    data: tagsForSelectedNotes,
    isLoading: areTagsForSelectedNotesLoading,
    isError: areTagsForSelectedNotesError,
    error: tagsForSelectedNotesError,
  } = useTagsForNotesQuery(selectedFilePaths);

  const baseTagCounts = buildBaseTagCounts(tagsForSelectedNotes);
  const baseTagCountsKey = createTagCountsKey(baseTagCounts);

  const [tagCountState, setTagCountState] = useState<{
    baseKey: string;
    overrides: Map<string, number>;
  }>(() => ({
    baseKey: baseTagCountsKey,
    overrides: new Map<string, number>(),
  }));

  const currentOverrides =
    tagCountState.baseKey === baseTagCountsKey
      ? tagCountState.overrides
      : new Map<string, number>();

  const selectedTagCounts = mergeTagCounts(baseTagCounts, currentOverrides);

  /**
   * Updates the selected tag counts. Stores only the diff against the current
   * base counts (overrides) so that when the base data refetches, previously
   * stale user selections are cleanly discarded.
   */
  function setSelectedTagCounts(
    action:
      | Map<string, number>
      | ((prev: Map<string, number>) => Map<string, number>)
  ) {
    setTagCountState((prev) => {
      const prevOverrides =
        prev.baseKey === baseTagCountsKey
          ? prev.overrides
          : new Map<string, number>();
      const merged = mergeTagCounts(baseTagCounts, prevOverrides);

      const nextMap = typeof action === 'function' ? action(merged) : action;

      const nextOverrides = new Map<string, number>();
      nextMap.forEach((value, key) => {
        if (baseTagCounts.get(key) !== value) {
          nextOverrides.set(key, value);
        }
      });

      return {
        baseKey: baseTagCountsKey,
        overrides: nextOverrides,
      };
    });
  }

  /**
   * Records a newly-created tag locally (it doesn't exist in the backend yet)
   * and marks it as fully selected for all currently-selected notes.
   */
  const handleCreateTag = (tagName: string) => {
    setTagsCreatedButNotSaved((prev) => [...new Set([...prev, tagName])]);
    setSelectedTagCounts((prev) => {
      const next = new Map(prev);
      next.set(tagName, totalSelectedNotes);
      return next;
    });
    setSearchTerm('');
  };

  const allTagsInDialog = [
    ...new Set([...(allTags ?? []), ...tagsCreatedButNotSaved]),
  ];

  // Filter tags based on search term and sort alphabetically
  const displayedTags =
    allTagsInDialog
      ?.filter((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.localeCompare(b)) || [];

  /**
   * Ref callback that autofocuses the tag search input when it mounts.
   */
  const inputRefCallback: RefCallback<HTMLInputElement> = (node) => {
    node?.focus();
  };

  // The onSubmit for the dialog needs to get data for all checkboxes that are
  // selected and not selected.
  const tagsToAddOrRemove = Array.from(selectedTagCounts.entries())
    .filter(([, count]) => count === 0 || count === totalSelectedNotes)
    .reduce(
      (acc, [tagName, count]) => ({
        tagNamesToRemove:
          count === 0
            ? [...acc.tagNamesToRemove, tagName]
            : acc.tagNamesToRemove,
        tagNamesToAdd:
          count === totalSelectedNotes
            ? [...acc.tagNamesToAdd, tagName]
            : acc.tagNamesToAdd,
      }),
      {
        tagNamesToRemove: [] as string[],
        tagNamesToAdd: [] as string[],
      }
    );

  const hasTagData = allTagsInDialog && allTagsInDialog.length > 0;
  const anyTagDataLoading = areTagsLoading || areTagsForSelectedNotesLoading;

  return (
    <fieldset className="flex flex-col gap-2">
      <input
        type="hidden"
        name="tag-names-to-add"
        value={JSON.stringify(tagsToAddOrRemove.tagNamesToAdd)}
      />
      <input
        type="hidden"
        name="tag-names-to-remove"
        value={JSON.stringify(tagsToAddOrRemove.tagNamesToRemove)}
      />
      <p>Select tags to add to or remove from {totalSelectedNotes} note(s) </p>

      <SelectedTagsDisplay
        selectedTagCounts={selectedTagCounts}
        setSelectedTagCounts={setSelectedTagCounts}
        totalSelectedNotes={totalSelectedNotes}
        setTagsCreatedButNotSaved={setTagsCreatedButNotSaved}
      />
      {(anyTagDataLoading || hasTagData) && (
        <div className="py-1.5">
          {anyTagDataLoading && <RouteFallback className="my-1" />}
          {hasTagData && (
            <>
              <TagSearchInput
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onCreateTag={handleCreateTag}
                isLoading={areTagsLoading}
                hasError={areTagsError}
                inputRef={inputRefCallback}
              />
              <TagSelectionList
                displayedTags={displayedTags}
                selectedTagCounts={selectedTagCounts}
                totalSelectedNotes={totalSelectedNotes}
                searchTerm={searchTerm}
                setSelectedTagCounts={setSelectedTagCounts}
                onCreateTag={handleCreateTag}
              />
            </>
          )}
        </div>
      )}
      {(areTagsError || areTagsForSelectedNotesError) && (
        <p className="text-red-500 text-sm">
          {tagsError?.message || tagsForSelectedNotesError?.message}
        </p>
      )}
      <DialogErrorText errorText={errorText} />
      <MotionButton
        className="w-[calc(100%-4rem)] mx-auto text-center justify-center"
        type="submit"
        {...getDefaultButtonVariants()}
      >
        <span>Save</span>
        <TagPlus
          width="1.0625rem"
          height="1.0625rem"
          className="will-change-transform"
        />
      </MotionButton>
    </fieldset>
  );
}

/**
 * Builds a map of tag name → number of selected notes that have that tag.
 * A count equal to the total number of selected notes means every selected
 * note has the tag; anything in between represents partial selection.
 */
function buildBaseTagCounts(
  tagsForSelectedNotes: Record<string, string[] | undefined> | undefined | null
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
function createTagCountsKey(tagCounts: Map<string, number>) {
  const entries = Array.from(tagCounts.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return JSON.stringify(entries);
}

/**
 * Returns a new map composed of the base tag counts with the user's override
 * entries layered on top.
 */
function mergeTagCounts(
  base: Map<string, number>,
  overrides: Map<string, number>
) {
  const merged = new Map(base);
  overrides.forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
}
