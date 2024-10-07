import { useMutation } from "@tanstack/react-query";
import { useSetAtom } from "jotai/react";
import type { LexicalEditor } from "lexical";
import { toast } from "sonner";
import { backendQueryAtom } from "../atoms";
import { insertAttachmentFromFile } from "../components/editor/utils/toolbar";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";

export function useAttachmentsMutation({
	folder,
	note,
	editor,
}: { folder: string; note: string; editor: LexicalEditor }) {
	const setBackendQuery = useSetAtom(backendQueryAtom);
	const insertAttachmentsMutation = useMutation({
		mutationFn: async () => {
			setBackendQuery({
				isLoading: true,
				message: "Inserting Attachments",
			});
			await insertAttachmentFromFile(folder, note, editor);
		},
		onSuccess: () => {
			setBackendQuery({
				isLoading: false,
				message: "",
			});
		},
		onError: () =>
			toast.error(
				"An Unknown Error Occurred. Please Try Again Later",
				DEFAULT_SONNER_OPTIONS,
			),
	});

	return { insertAttachmentsMutation };
}
