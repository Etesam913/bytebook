import { useSetAtom } from "jotai";
import { toast } from "sonner";
import { backendQueryAtom } from "../atoms";
import { DEFAULT_SONNER_OPTIONS } from "../utils/misc";

// biome-ignore lint/suspicious/noExplicitAny: Any is fine here
export function useBackendFunction<TArgs extends any[]>(
	tryFunction: (...args: TArgs) => Promise<void>,
	loadingMessage?: string,
	catchFunction?: (error: unknown) => void,
) {
	const setBackendQuery = useSetAtom(backendQueryAtom);

	return async (...args: TArgs) => {
		setBackendQuery({
			isLoading: true,
			message: loadingMessage ? loadingMessage : "Loading...",
		});
		try {
			await tryFunction(...args);
		} catch (e: unknown) {
			if (catchFunction) catchFunction(e);
			else {
				toast.error("An unknown error occurred", DEFAULT_SONNER_OPTIONS);
			}
			console.error(e);
		} finally {
			setBackendQuery({
				isLoading: false,
				message: "",
			});
		}
	};
}
