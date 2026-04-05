import type { KeyboardEvent, RefObject } from 'react';
import { navigate } from 'wouter/use-browser-location';
import type { VirtualizedListHandle } from '../../virtualized/virtualized-list';
import type { SearchResult } from '../../../hooks/search';
import { routeUrls } from '../../../utils/routes';

/**
 * Checks if the event target is an editable element like an input, textarea, or contenteditable element.
 */
function isEditableTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  if (!element) return false;
  return Boolean(element.closest('input, textarea, [contenteditable="true"]'));
}

/**
 * Extracts and parses the search result index from an HTML element's data attribute.
 */
function getIndexFromElement(element: HTMLElement | null) {
  if (!element) return null;
  const rawIndex = element.dataset.searchResultIndex;
  if (rawIndex === undefined) return null;
  const index = Number(rawIndex);
  return Number.isNaN(index) ? null : index;
}

/**
 * Finds and returns the DOM wrapper element for a search result item at the specified index.
 */
function getItemWrapper(scrollContainer: HTMLElement | null, index: number) {
  if (!scrollContainer) return null;
  return scrollContainer.querySelector<HTMLElement>(
    `[data-search-result-index="${index}"]`
  );
}

/**
 * Focuses the button element within a search result item at the specified index.
 * If the item is not currently rendered, it will scroll to it first and then focus after a brief delay.
 */
export function focusItemAtIndex({
  scrollContainer,
  resultsLength,
  index,
  listHandleRef,
}: {
  scrollContainer: HTMLElement | null;
  resultsLength: number;
  index: number;
  listHandleRef: RefObject<VirtualizedListHandle | null>;
}) {
  if (index < 0 || index >= resultsLength) return;

  const existingWrapper = getItemWrapper(scrollContainer, index);
  if (existingWrapper) {
    const focusTarget = existingWrapper.querySelector<HTMLElement>('button');
    focusTarget?.focus();
    return;
  }

  // Item is virtualized away — scroll to it and retry
  listHandleRef.current?.scrollToIndexIfHidden(index);

  const attemptFocusAfterRender = (attempt: number) => {
    const wrapper = getItemWrapper(scrollContainer, index);
    const focusTarget = wrapper?.querySelector<HTMLElement>('button');
    if (focusTarget) {
      focusTarget.focus();
      return;
    }

    if (attempt < 6) {
      requestAnimationFrame(() => attemptFocusAfterRender(attempt + 1));
    }
  };

  requestAnimationFrame(() => attemptFocusAfterRender(1));
}

/**
 * Handles keyboard navigation within the search results section.
 * Arrow keys move focus between results; ArrowUp from the first result returns focus to the input.
 */
export function handleSearchResultsKeyDown({
  inputRef,
  scrollContainer,
  results,
  searchQuery,
  listHandleRef,
  event,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  scrollContainer: HTMLElement | null;
  results: SearchResult[];
  searchQuery: string;
  listHandleRef: RefObject<VirtualizedListHandle | null>;
  event: KeyboardEvent<HTMLElement>;
}) {
  if (isEditableTarget(event.target)) return;
  const isArrowDown = event.key === 'ArrowDown';
  const isArrowUp = event.key === 'ArrowUp';
  if (!isArrowDown && !isArrowUp) return;
  event.preventDefault();

  const target = event.target as HTMLElement | null;
  const currentWrapper = target?.closest<HTMLElement>(
    '[data-search-result-index]'
  );
  const currentIndex = getIndexFromElement(currentWrapper ?? null);

  if (isArrowUp && (currentIndex === null || currentIndex === 0)) {
    // Going up from the results back to the input
    inputRef.current?.focus();
    return;
  }

  const direction = isArrowDown ? 1 : -1;
  const startIndex = currentIndex ?? (direction === 1 ? -1 : results.length);
  const nextIndex = startIndex + direction;

  if (nextIndex >= 0 && nextIndex < results.length) {
    focusItemAtIndex({
      scrollContainer,
      resultsLength: results.length,
      index: nextIndex,
      listHandleRef,
    });
    const result = results[nextIndex];
    if (result) {
      navigate(routeUrls.search(searchQuery, result.filePath.encodedPath));
    }
  }
}
