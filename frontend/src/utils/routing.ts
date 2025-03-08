import { useSearch } from 'wouter';

/**
 * Custom hook to parse the search parameters from the URL and return them as an object.
 *
 * @returns An object containing the search parameters as key-value pairs.
 */
export function useSearchParamsEntries(): Record<string, string> {
  const searchString = useSearch();
  const searchParamsObject = Object.fromEntries(
    new URLSearchParams(searchString).entries()
  );
  return searchParamsObject;
}
/**
 * Finds the closest navigable sidebar item index after a deletion.
 *
 * This function searches for the closest item to navigate to in a sidebar list
 * after an item has been deleted. It checks both left and right of the deleted
 * item's position in the old list to find the nearest item that still exists
 * in the new list. If no such item is found, it defaults to returning the first
 * item in the new list.
 *
 * @param deletedItem - The item that was deleted.
 * @param oldItems - The list of items before deletion.
 * @param newItems - The list of items after deletion.
 * @returns The index of the closest item to navigate to in the new list.
 */
export function findClosestSidebarItemToNavigateTo(
  deletedItem: string,
  oldItems: string[],
  newItems: string[]
): number {
  const newItemsSet = new Set(newItems);
  const indexOfDeletedItem = oldItems.findIndex((item) => item === deletedItem);
  if (indexOfDeletedItem === -1) return 0;

  let leftPointer = indexOfDeletedItem - 1;
  let rightPointer = indexOfDeletedItem + 1;

  while (leftPointer > -1 || rightPointer < oldItems.length) {
    if (leftPointer > -1) {
      const leftItem = oldItems[leftPointer];
      if (newItemsSet.has(leftItem)) {
        return newItems.indexOf(leftItem);
      }
      leftPointer -= 1;
    }
    if (rightPointer < oldItems.length) {
      const rightItem = oldItems[rightPointer];
      if (newItemsSet.has(rightItem)) {
        return newItems.indexOf(rightItem);
      }
      rightPointer += 1;
    }
  }

  return 0;
}
