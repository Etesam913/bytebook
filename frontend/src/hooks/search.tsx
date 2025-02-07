import { useMutation } from "@tanstack/react-query";
import { Window } from "@wailsio/runtime";
import { useSetAtom } from "jotai";
import { SearchFileNamesFromQuery } from "../../bindings/github.com/etesam913/bytebook/searchservice";
import { searchPanelDataAtom } from "../atoms";
import { useWailsEvent } from "../utils/hooks";

export function useSearchPanel() {
	const setSearchPanelData = useSetAtom(searchPanelDataAtom);

	useWailsEvent("search:open-panel", async (data) => {
		const windowName = await Window.Name();
		if (windowName !== data.sender) return;
		setSearchPanelData((prev) => ({ ...prev, isOpen: !prev.isOpen }));
	});
}

export function useSearchMutation() {
	return useMutation({
		mutationFn: async ({ searchQuery }: { searchQuery: string }) => {
			return await SearchFileNamesFromQuery(searchQuery);
		},
		onError: () => {
			return [];
		},
	});
}
