import { atom, useAtomValue, useSetAtom } from 'jotai';

const FOLDER_OPEN_ANIMATION_PENDING_MS = 1_500;

const folderOpenAnimationParentIdsAtom = atom(new Set<string>());

const folderOpenAnimationTimeouts = new Map<
  string,
  ReturnType<typeof setTimeout>
>();

// Returns the folder IDs whose visible descendants should currently animate in.
export function useFolderOpenAnimationParentIds() {
  return useAtomValue(folderOpenAnimationParentIdsAtom);
}

const triggerFolderOpenAnimationAtom = atom(
  null,
  (_, set, folderId: string) => {
    // Add the folder ID to start the enter animation for its descendants
    set(folderOpenAnimationParentIdsAtom, (currentFolderIds) => {
      const nextFolderIds = new Set(currentFolderIds);
      nextFolderIds.add(folderId);
      return nextFolderIds;
    });

    // Clear any active timeout for this folder to prevent stale timer callback triggers
    const existingTimeout = folderOpenAnimationTimeouts.get(folderId);
    if (existingTimeout !== undefined) {
      clearTimeout(existingTimeout);
    }

    // Schedule the removal of the folder ID after the animation duration completes
    const timeoutId = setTimeout(() => {
      folderOpenAnimationTimeouts.delete(folderId);
      set(folderOpenAnimationParentIdsAtom, (currentFolderIds) => {
        if (!currentFolderIds.has(folderId)) return currentFolderIds;

        const nextFolderIds = new Set(currentFolderIds);
        nextFolderIds.delete(folderId);
        return nextFolderIds;
      });
    }, FOLDER_OPEN_ANIMATION_PENDING_MS);

    // Track the timeout so it can be cleared if the folder open triggers again before finishing
    folderOpenAnimationTimeouts.set(folderId, timeoutId);
  }
);

// Exposes an event-style trigger for marking a folder open animation active.
export function useFolderOpenAnimationActions() {
  const triggerFolderOpenAnimation = useSetAtom(triggerFolderOpenAnimationAtom);
  return { triggerFolderOpenAnimation };
}
