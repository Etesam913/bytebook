import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  QueryClient,
} from '@tanstack/react-query';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { toast } from 'sonner';
import { navigate } from 'wouter/use-browser-location';
import {
  AddFolder,
  DeleteFolder,
  GetFolders,
  RenameFolder,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/folderservice';
import {
  AddNoteToFolder,
  MoveNoteToFolder,
  RevealFolderOrFileInFinder,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { DEFAULT_SONNER_OPTIONS } from '../utils/general';
import { QueryError } from '../utils/query';
import {
  validateName,
  getContentTypeAndValueFromSelectionRangeValue,
} from '../utils/string-formatting';
import { routeUrls } from '../utils/routes';
import { useWailsEvent } from './events';
import { isEventInCurrentWindow } from '../utils/events';
import { useCreateFolderDialog } from './dialogs';

type FoldersQueryData = {
  alphabetizedFolders: string[];
  previousAlphabetizedFolders: string[] | undefined;
};

export const folderQueries = {
  getFolders: (queryClient: QueryClient) =>
    queryOptions({
      queryKey: ['folders'],
      queryFn: async () => {
        const res = await GetFolders();
        if (!res.success) {
          throw new QueryError(res.message);
        }
        const previousQueryData = queryClient.getQueryData<FoldersQueryData>([
          'folders',
        ]);
        const previousFolders = previousQueryData?.alphabetizedFolders;
        return {
          alphabetizedFolders: (res.data ?? []).sort((a, b) =>
            a.localeCompare(b)
          ),
          previousAlphabetizedFolders: previousFolders || undefined,
        };
      },
    }),
};

/**
 * Custom hook to fetch and manage folders.
 *
 * @param curFolder - The current folder name from the URL.
 * @returns An object containing the query data and alphabetized folders.
 */
export function useFolders() {
  const queryClient = useQueryClient();
  return useQuery(folderQueries.getFolders(queryClient));
}

/** This function is used to handle `folder:create` events */
export function useFolderCreate() {
  const queryClient = useQueryClient();

  useWailsEvent('folder:create', async () => {
    console.info('folder:create');
    await queryClient.invalidateQueries({
      queryKey: folderQueries.getFolders(queryClient).queryKey,
    });
  });
}

/** This function is used to handle `notes-folder:delete` events. This gets triggered when renaming a folder using the file system*/
export function useFolderDelete() {
  const queryClient = useQueryClient();

  useWailsEvent('folder:delete', async () => {
    console.info('folder:delete');
    await queryClient.invalidateQueries({
      queryKey: folderQueries.getFolders(queryClient).queryKey,
    });
  });
}

/**
 * Custom hook to handle moving notes into a folder.
 */
export function useMoveNoteIntoFolder() {
  return useMutation({
    mutationFn: async ({
      backendNotePaths,
      newFolder,
    }: {
      backendNotePaths: string[];
      newFolder: string;
    }) => {
      const res = await MoveNoteToFolder(backendNotePaths, newFolder);
      if (!res.success) throw new QueryError(res.message);
    },
  });
}

/**
 * Custom hook to handle folder creation through a dialog form submission.
 * Optimistically updates the cache so that navigation can happen without
 * a 404 page error
 */
export function useFolderCreateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      e,
      setErrorText: _setErrorText,
    }: {
      e: FormEvent<HTMLFormElement>;
      setErrorText: Dispatch<SetStateAction<string>>;
    }): Promise<boolean> => {
      // Extract form data and validate the folder name
      const formData = new FormData(e.target as HTMLFormElement);
      const newFolderName = formData.get('folder-name');
      const { isValid, errorMessage } = validateName(newFolderName, 'folder');
      if (!isValid) throw new Error(errorMessage);
      if (!newFolderName) return false;

      const newFolderNameString = newFolderName.toString().trim();

      // Handle folder creation
      const res = await AddFolder(newFolderNameString);
      if (!res.success) throw new Error(res.message);

      // Add an untitled note to the newly created folder
      const addNoteRes = await AddNoteToFolder(newFolderNameString, 'Untitled');
      if (addNoteRes.success) {
        // Store the folder name for navigation in onSuccess
        (e.target as any).__folderName = newFolderNameString;
        return true;
      }
      throw new Error(addNoteRes.message);
    },
    // Optimistically update cache
    onMutate: async (variables) => {
      const getFoldersQueryKey = folderQueries.getFolders(queryClient).queryKey;
      await queryClient.cancelQueries({
        queryKey: getFoldersQueryKey,
      });
      const previousFolders = queryClient.getQueryData(getFoldersQueryKey);

      const formData = new FormData(variables.e.target as HTMLFormElement);
      const newFolderName =
        formData.get('folder-name')?.toString()?.trim() ?? '';

      // Only perform optimistic update if the new folder name doesn't already exist
      if (newFolderName && previousFolders?.alphabetizedFolders) {
        const folderAlreadyExists =
          previousFolders.alphabetizedFolders.includes(newFolderName);

        // Skip optimistic update if folder already exists to avoid duplicate keys
        if (!folderAlreadyExists) {
          const updatedFolders: FoldersQueryData = {
            alphabetizedFolders: [
              ...previousFolders.alphabetizedFolders,
              newFolderName,
            ].sort((a, b) => a.localeCompare(b)),
            previousAlphabetizedFolders:
              previousFolders.alphabetizedFolders || undefined,
          };
          queryClient.setQueryData(getFoldersQueryKey, updatedFolders);
        }
      }

      return { previousFolders };
    },
    onSuccess: (result, variables) => {
      const folderName = (variables.e.target as any).__folderName;
      if (result && folderName) {
        navigate(routeUrls.folder(folderName));
      }
      const getFoldersQueryKey = folderQueries.getFolders(queryClient).queryKey;
      queryClient.invalidateQueries({
        queryKey: getFoldersQueryKey,
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousFolders) {
        const getFoldersQueryKey =
          folderQueries.getFolders(queryClient).queryKey;
        queryClient.setQueryData(getFoldersQueryKey, context.previousFolders);
      }
      if (error instanceof Error) variables.setErrorText(error.message);
      else
        variables.setErrorText(
          'An unknown error occurred. Please try again later.'
        );
    },
  });
}

/**
 * Custom hook to handle folder renaming through a dialog form submission.
 */
export function useFolderRenameMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      e,
      folderFromSidebar,
      setErrorText: _setErrorText,
    }: {
      e: FormEvent<HTMLFormElement>;
      folderFromSidebar: string;
      setErrorText: Dispatch<SetStateAction<string>>;
    }): Promise<boolean> => {
      // Extract form data and validate the folder name
      const formData = new FormData(e.target as HTMLFormElement);
      const newFolderName = formData.get('folder-name');
      const { isValid, errorMessage } = validateName(newFolderName, 'folder');
      if (!isValid) throw new Error(errorMessage);
      if (!newFolderName) return false;

      const newFolderNameString = newFolderName.toString().trim();

      // Handle folder renaming
      if (!folderFromSidebar) throw new Error('Something went wrong');
      const res = await RenameFolder(folderFromSidebar, newFolderNameString);
      if (!res.success) throw new Error(res.message);

      // Store the folder name for navigation in onSuccess
      (e.target as any).__folderName = newFolderNameString;
      return true;
    },
    // Optimistically update cache
    onMutate: async (variables) => {
      const getFoldersQueryKey = folderQueries.getFolders(queryClient).queryKey;
      await queryClient.cancelQueries({
        queryKey: getFoldersQueryKey,
      });
      const previousFolders = queryClient.getQueryData(getFoldersQueryKey);

      const formData = new FormData(variables.e.target as HTMLFormElement);
      const newFolderName =
        formData.get('folder-name')?.toString()?.trim() ?? '';

      // Only perform optimistic update if the new folder name doesn't already exist
      if (newFolderName && previousFolders?.alphabetizedFolders) {
        const folderAlreadyExists =
          previousFolders.alphabetizedFolders.includes(newFolderName);

        // Skip optimistic update if folder already exists to avoid duplicate keys
        if (!folderAlreadyExists) {
          const updatedFolders: FoldersQueryData = {
            alphabetizedFolders: previousFolders.alphabetizedFolders
              .map((folder) =>
                folder === variables.folderFromSidebar ? newFolderName : folder
              )
              .sort((a, b) => a.localeCompare(b)),
            previousAlphabetizedFolders:
              previousFolders.alphabetizedFolders || undefined,
          };
          queryClient.setQueryData(getFoldersQueryKey, updatedFolders);
        }
      }

      return { previousFolders };
    },
    onSuccess: (result, variables) => {
      const folderName = (variables.e.target as any).__folderName;
      if (result && folderName) {
        navigate(routeUrls.folder(folderName));
      }
      const getFoldersQueryKey = folderQueries.getFolders(queryClient).queryKey;
      queryClient.invalidateQueries({
        queryKey: getFoldersQueryKey,
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousFolders) {
        const getFoldersQueryKey =
          folderQueries.getFolders(queryClient).queryKey;
        queryClient.setQueryData(getFoldersQueryKey, context.previousFolders);
      }
      if (error instanceof Error) variables.setErrorText(error.message);
      else
        variables.setErrorText(
          'An unknown error occurred. Please try again later.'
        );
    },
  });
}

/**
 * Custom hook to handle folder deletion through a dialog form submission.
 */
export function useFolderDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderFromSidebar,
      setErrorText: _setErrorText,
    }: {
      folderFromSidebar: string;
      setErrorText: Dispatch<SetStateAction<string>>;
    }): Promise<boolean> => {
      // Handle folder deletion
      if (!folderFromSidebar) throw new Error('Something went wrong');
      const res = await DeleteFolder(folderFromSidebar);
      if (!res.success) throw new Error(res.message);
      return true;
    },
    onSuccess: () => {
      const getFoldersQueryKey = folderQueries.getFolders(queryClient).queryKey;
      queryClient.invalidateQueries({
        queryKey: getFoldersQueryKey,
      });
    },
    onError: (error, variables) => {
      if (error instanceof Error) variables.setErrorText(error.message);
      else
        variables.setErrorText(
          'An unknown error occurred. Please try again later.'
        );
    },
  });
}

/**
 * Custom hook to handle the "folder:create-dialog" Wails event.
 * Opens the create folder dialog when the event is received for the current window.
 */
export function useFolderCreateDialogEvent(): void {
  const openCreateFolderDialog = useCreateFolderDialog();

  useWailsEvent('folder:create-dialog', async (data) => {
    if (!(await isEventInCurrentWindow(data))) return;
    openCreateFolderDialog();
  });
}

/** Custom hook to handle revealing folders in Finder */
export function useFolderRevealInFinderMutation() {
  return useMutation({
    // The main function that handles revealing folders in Finder
    mutationFn: async ({ selectionRange }: { selectionRange: Set<string> }) => {
      // Limit the number of folders to reveal to 5
      const selectedFolders = [...selectionRange].slice(0, 5);

      // Reveal each selected folder in Finder
      const res = await Promise.all(
        selectedFolders.map(async (selectionRangeValue) => {
          const { value: folder } =
            getContentTypeAndValueFromSelectionRangeValue(selectionRangeValue);
          return await RevealFolderOrFileInFinder(`notes/${folder}`, true);
        })
      );

      // Check if any folder failed to reveal
      if (res.some((r) => !r.success)) {
        throw new Error('Failed to reveal a folder in Finder');
      }
    },
    // Handle errors that occur during the mutation
    onError: (e) => {
      if (e instanceof Error) {
        toast.error(e.message, DEFAULT_SONNER_OPTIONS);
      }
    },
  });
}
