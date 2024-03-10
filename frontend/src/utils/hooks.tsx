import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { useMotionValue } from "framer-motion";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";

export const useDelayedLoader = (
	value = false,
	delay = 500,
): [boolean, Dispatch<SetStateAction<boolean>>] => {
	const [loading, setLoading] = useState<boolean>(value);
	const [delayedLoading, setDelayedLoading] = useState<boolean>(value);
	const loadTimeoutId = useRef<null | number>(null);

	const clearLoadTimeout = () => {
		if (loadTimeoutId.current != null) {
			window.clearTimeout(loadTimeoutId.current);
			loadTimeoutId.current = null;
		}
	};
	useEffect(() => {
		clearLoadTimeout();
		if (loading === false) setDelayedLoading(false);
		else {
			loadTimeoutId.current = window.setTimeout(
				() => setDelayedLoading(true),
				delay,
			);
		}

		return () => {
			clearLoadTimeout();
		};
	}, [delay, loading, clearLoadTimeout]);

	return [delayedLoading, setLoading];
};

export function useResizeState(nodeKey: string) {
	const widthMotionValue = useMotionValue(-1);

	const [isResizing, setIsResizing] = useState(false);
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);

	return {
		widthMotionValue,
		isResizing,
		setIsResizing,
		isSelected,
		setSelected,
		clearSelection,
	};
}
