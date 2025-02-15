import type { SetStateAction } from "jotai";
import type { Dispatch } from "react";
import { toast } from "sonner";
import { navigate } from "wouter/use-browser-location";
import { GetNotesFromTag } from "../../bindings/github.com/etesam913/bytebook/tagsservice";
import type { SortStrings } from "../types";
import { extractInfoFromNoteName } from "./string-formatting";

export async function updateTagNotes(
	tagName: string,
	setNotes: Dispatch<SetStateAction<string[] | null>>,
	noteSort: SortStrings,
) {
	try {
		const res = await GetNotesFromTag(tagName, noteSort);
		if (res.success) {
			const notes = res.data;

			if (notes.length > 0) {
				const { noteNameWithoutExtension, queryParams } =
					extractInfoFromNoteName(notes[0]);
				navigate(
					`/tags/${tagName}/${noteNameWithoutExtension}?ext=${queryParams.ext}`,
				);
			}
			setNotes(notes);
		} else {
			throw new Error(res.message);
		}
	} catch (e) {
		if (e instanceof Error) {
			toast.error(e.message);
		}
	}
}
