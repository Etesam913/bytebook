import { Window } from "@wailsio/runtime";
import { useSetAtom } from "jotai";
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
