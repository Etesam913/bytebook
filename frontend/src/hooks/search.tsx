import { useSetAtom } from "jotai";
import { searchPanelDataAtom } from "../atoms";
import { useWailsEvent } from "../utils/hooks";

export function useSearchPanel() {
	const setSearchPanelData = useSetAtom(searchPanelDataAtom);

	useWailsEvent("search:open-panel", async () => {
		setSearchPanelData((prev) => ({ ...prev, isOpen: !prev.isOpen }));
	});
}
