import { useSetAtom } from "jotai";
import { isSearchPanelOpenAtom } from "../atoms";
import { useWailsEvent } from "../utils/hooks";

export function useSearchPanel() {
	const setIsSearchPanelOpen = useSetAtom(isSearchPanelOpenAtom);

	useWailsEvent("search:open-panel", () => {
		console.log("search:open-panel");
		setIsSearchPanelOpen(true);
	});
}
