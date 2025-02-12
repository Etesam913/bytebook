import { useMutation, useQuery } from "@tanstack/react-query";
import { Events } from "@wailsio/runtime";
import { useAtomValue, useSetAtom } from "jotai/react";
import type { LexicalEditor } from "lexical";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { toast } from "sonner";
import type { NoteEntry } from "../../bindings/github.com/etesam913/bytebook/lib/project_types/models";
import {
	GetNotePreview,
	GetNotes,
	MoveToTrash,
	RevealNoteInFinder,
} from "../../bindings/github.com/etesam913/bytebook/noteservice";
import {
	AddPathsToTags,
	DeleteTags,
} from "../../bindings/github.com/etesam913/bytebook/tagsservice";
import { WINDOW_ID } from "../App";
import {
	noteSortAtom,
	projectSettingsAtom,
	selectionRangeAtom,
} from "../atoms";
import { CUSTOM_TRANSFORMERS } from "../components/editor/transformers";
import { $convertFromMarkdownStringCorrect } from "../components/editor/utils/note-metadata";
import { useWailsEvent } from "../hooks/events";
import { DEFAULT_SONNER_OPTIONS } from "../utils/general";
import { getFolderAndNoteFromSelectionRange } from "../utils/selection";
import {
	extractInfoFromNoteName,
	getTagNameFromSetValue,
} from "../utils/string-formatting";
import { useUpdateProjectSettingsMutation } from "./project-settings";

/** This function is used to handle note:create events */
export function useNoteCreate(
	folder: string,
	notes: NoteEntry[],
	setNotes: Dispatch<SetStateAction<NoteEntry[] | null>>,
) {
	const noteSortData = useAtomValue(noteSortAtom);
	useWailsEvent("note:create", async (body) => {
		const data = (body.data as { folder: string; note: string }[][])[0];

		/*
    If none of the added notes are in the current folder, then don't update the notes
    This can be triggered when there are multple windows open

    There is notes.includes to deal with the Untitled Note race condition
    */
		const filteredNotes = data
			.filter(
				(item) =>
					item.folder === decodeURIComponent(folder) &&
					!notes.some((note) => note.name === item.note),
			)
			.map((item) => item.note);

		if (filteredNotes.length === 0) return;

		const newNotes = await GetNotes(data[0].folder, noteSortData);
		if (!newNotes.success) {
			toast.error(newNotes.message, DEFAULT_SONNER_OPTIONS);
		} else {
			setNotes(newNotes.data);
		}
	});
}
/** This function is used to handle note:delete events */
export function useNoteDelete(
	folder: string,
	note: string | undefined,
	setNotes: Dispatch<SetStateAction<NoteEntry[] | null>>,
) {
	useWailsEvent("note:delete", (body) => {
		const data = (body.data as { folder: string; note: string }[][])[0];

		/*
     If none of the deleted notes are in the current folder, then don't update the notes
     This can be triggered when there are multple windows open
    */
		if (
			data.filter(
				({ folder: folderWithDeletedNotes }) =>
					folderWithDeletedNotes === decodeURIComponent(folderWithDeletedNotes),
			).length === 0
		)
			return;

		setNotes((prev) => {
			if (!prev) return prev;
			// Filter out all notes that are in the same folder as a deleted note/
			const newNotes = prev.filter(
				(noteEntry) =>
					!data.some(
						({ folder: folderWithDeletedNotes, note: deletedNote }) =>
							folder === folderWithDeletedNotes &&
							noteEntry.name === deletedNote,
					),
			);
			if (!note) return newNotes;

			return newNotes;
		});
	});
}

/** This function is used to handle note:open-in-new-window events */
export function useNoteOpenInNewWindow(
	folder: string,
	selectionRange: Set<string>,
	setSelectionRange: Dispatch<SetStateAction<Set<string>>>,
) {
	useWailsEvent("note:open-in-new-window", () => {
		for (const noteNameWithQueryParam of selectionRange) {
			Events.Emit({
				name: "open-note-in-new-window-backend",
				data: { url: `/${folder}/${noteNameWithQueryParam}` },
			});
		}
		setSelectionRange(new Set());
	});
}

export function useNoteSelectionClear() {
	const setSelectionRange = useSetAtom(selectionRangeAtom);
	useWailsEvent("note:clear-selection", () => {
		setSelectionRange(new Set());
	});
}

/** Custom hook to handle revealing folders in Finder */
export function useNoteRevealInFinderMutation() {
	return useMutation({
		// The main function that handles revealing folders in Finder
		mutationFn: async ({
			selectionRange,
			folder,
		}: { selectionRange: Set<string>; folder: string }) => {
			// Limit the number of folders to reveal to 5
			const selectedFolders = [...selectionRange].slice(0, 5);

			// Reveal each selected folder in Finder
			const res = await Promise.all(
				selectedFolders.map(async (note) => {
					const noteWithoutWithoutPrefix = note.split(":")[1];
					const { noteNameWithoutExtension, queryParams } =
						extractInfoFromNoteName(noteWithoutWithoutPrefix);
					return await RevealNoteInFinder(
						folder,
						`${noteNameWithoutExtension}.${queryParams.ext}`,
					);
				}),
			);

			// Check if any folder failed to reveal
			if (res.some((r) => !r.success)) {
				throw new Error("Failed to reveal folder in finder");
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

export function useMoveNoteToTrashMutation() {
	return useMutation({
		mutationFn: async ({
			selectionRange,
			folder,
		}: { selectionRange: Set<string>; folder: string }) => {
			const folderAndNoteNames = getFolderAndNoteFromSelectionRange(
				folder,
				selectionRange,
			);
			const res = await MoveToTrash(folderAndNoteNames);
			if (!res.success) throw new Error(res.message);
		},
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
		},
	});
}

export function usePinNotesMutation() {
	const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
	const projectSettings = useAtomValue(projectSettingsAtom);

	return useMutation({
		mutationFn: async ({
			selectionRange,
			folder,
			shouldPin,
		}: { selectionRange: Set<string>; folder: string; shouldPin: boolean }) => {
			const folderAndNoteNames = getFolderAndNoteFromSelectionRange(
				folder,
				selectionRange,
			);
			const newProjectSettings = { ...projectSettings };
			if (shouldPin) {
				folderAndNoteNames.forEach((folderAndNoteName) => {
					newProjectSettings.pinnedNotes.add(folderAndNoteName);
				});
			} else {
				folderAndNoteNames.forEach((folderAndNoteName) => {
					newProjectSettings.pinnedNotes.delete(folderAndNoteName);
				});
			}
			updateProjectSettings({ newProjectSettings });
		},
		// Handle errors that occur during the mutation
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
		},
	});
}

type AddTagsMutationVariables = {
	e: FormEvent<HTMLFormElement>;
	setErrorText: Dispatch<SetStateAction<string>>;
	folder: string;
	selectionRange: Set<string>;
};

/**
 * Custom hook to handle deleting tags.
 *
 * @param {Object} variables - The variables for the mutation.
 * @param {Set<string>} variables.tagsToDelete - The set of tags to delete. The set items start with the tag: prefix as they come from the `selectionRange` set.
 */
export function useDeleteTagsMutation() {
	return useMutation({
		mutationFn: async ({ tagsToDelete }: { tagsToDelete: Set<string> }) => {
			const tagsToDeleteList = Array.from(tagsToDelete).map((tagWithPrefix) =>
				getTagNameFromSetValue(tagWithPrefix),
			);
			const res = await DeleteTags(tagsToDeleteList);
			if (!res.success) {
				throw new Error(res.message);
			}
			return true;
		},
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
			return false;
		},
	});
}

export function useAddTagsMutation() {
	return useMutation({
		// The main function that handles adding tags to a note
		mutationFn: async ({
			e,
			folder,
			setErrorText,
			selectionRange,
		}: AddTagsMutationVariables) => {
			const formData = new FormData(e.target as HTMLFormElement);
			const tags = formData.getAll("tags");
			if (tags.length === 0) {
				setErrorText("You need to add a tag before confirming.");
				return false;
			}
			const tagsStrings = tags.map((tag) => tag.toString());
			const folderAndNotePaths = [...selectionRange].map(
				(noteWithQueryParam) => {
					const noteWithQueryParamWithoutPrefix =
						noteWithQueryParam.split(":")[1];
					const { noteNameWithoutExtension, queryParams } =
						extractInfoFromNoteName(noteWithQueryParamWithoutPrefix);

					return `${folder}/${noteNameWithoutExtension}.${queryParams.ext}`;
				},
			);
			// Add the tags to each selected note
			const addTagsRes = await AddPathsToTags(tagsStrings, folderAndNotePaths);

			if (!addTagsRes.success) {
				throw new Error(addTagsRes.message);
			}

			return true;
		},
		// Handle errors that occur during the mutation
		onError: (e) => {
			if (e instanceof Error) {
				toast.error(e.message, DEFAULT_SONNER_OPTIONS);
			}
			return false;
		},
	});
}

export function useNotePreviewQuery(
	curFolder: string,
	curNote: string,
	fileExtension: string,
) {
	return useQuery({
		queryKey: ["note-preview", curNote],
		queryFn: async () => {
			if (fileExtension !== "md") {
				return null;
			}
			return await GetNotePreview(`notes/${curFolder}/${curNote}.md`);
		},
	});
}

/**
 * Hook to handle the "note:changed" event.
 *
 * @param folder - The current folder name.
 * @param note - The current note name.
 * @param editor - The LexicalEditor instance to update the editor state.
 * @param setFrontmatter - A function to update the frontmatter state.
 */
export function useNoteChangedEvent(
	folder: string,
	note: string,
	editor: LexicalEditor,
	setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>,
) {
	useWailsEvent("note:changed", (e) => {
		const data = e.data as {
			folder: string;
			note: string;
			markdown: string;
			oldWindowAppId: string;
		};
		const {
			folder: folderName,
			note: noteName,
			markdown,
			oldWindowAppId,
		} = data;
		if (
			folderName === folder &&
			noteName === note &&
			oldWindowAppId !== WINDOW_ID
		) {
			editor.update(
				() => {
					$convertFromMarkdownStringCorrect(
						markdown,
						CUSTOM_TRANSFORMERS,
						setFrontmatter,
					);
				},
				{ tag: "note:changed-from-other-window" },
			);
		}
	});
}
