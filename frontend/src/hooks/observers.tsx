import { useAtomValue } from "jotai/react";
import type { LexicalEditor } from "lexical";
import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { noteContainerRefAtom } from "../atoms";
import type { FileNode } from "../components/editor/nodes/file";

/**
 * Custom hook for implementing list virtualization.
 * This hook optimizes rendering performance for large lists by only rendering visible items.
 *
 * @param items - Array of items to be virtualized
 * @param SIDEBAR_ITEM_HEIGHT - Height of each item in pixels
 * @param VIRUTALIZATION_HEIGHT - Additional height to render above and below the visible area
 * @param listRef - React ref object for the container element
 * @returns Object containing virtualization data and functions
 */
export function useListVirtualization(
	items: string[],
	SIDEBAR_ITEM_HEIGHT: number,
	VIRUTALIZATION_HEIGHT: number,
	listRef: RefObject<HTMLElement>,
	onScrollCallback?: (e: React.UIEvent<HTMLDivElement>) => void,
) {
	// State for tracking scroll position and container height
	const [scrollTop, setScrollTop] = useState(0);
	const [containerHeight, setContainerHeight] = useState(0);

	// Calculate the range of visible items
	const startIndex = useMemo(
		() => Math.floor(scrollTop / SIDEBAR_ITEM_HEIGHT),
		[scrollTop, SIDEBAR_ITEM_HEIGHT],
	);
	const endIndex = useMemo(
		() =>
			Math.min(
				startIndex +
					Math.ceil(
						containerHeight / (SIDEBAR_ITEM_HEIGHT - VIRUTALIZATION_HEIGHT),
					),
				items.length,
			),
		[
			startIndex,
			containerHeight,
			SIDEBAR_ITEM_HEIGHT,
			VIRUTALIZATION_HEIGHT,
			items.length,
		],
	);

	const visibleItems = useMemo(
		() => items.slice(startIndex, endIndex),
		[items, startIndex, endIndex],
	);

	// Update container height when resized
	useLayoutEffect(() => {
		const resizeObserver = new ResizeObserver((entries) => {
			const container = entries[0].target;
			setContainerHeight(container.clientHeight);
		});
		if (listRef.current) {
			resizeObserver.observe(listRef.current);
		}
		return () => {
			resizeObserver.disconnect();
		};
	}, [listRef]);

	// Handle scroll events
	function onScroll(e: React.UIEvent<HTMLDivElement>) {
		if (visibleItems.length > 0) {
			setScrollTop(Math.max(0, (e.target as HTMLElement).scrollTop));
			onScrollCallback?.(e);
		}
	}

	// Return virtualization data and functions
	return {
		listContainerHeight: `${items.length * SIDEBAR_ITEM_HEIGHT}px`,
		listHeight: `${visibleItems.length * SIDEBAR_ITEM_HEIGHT}px`,
		listTop: `${startIndex * SIDEBAR_ITEM_HEIGHT}px`,
		onScroll,
		visibleItems,
		startIndex,
		setScrollTop,
	};
}

/**
 * Custom hook for showing an element when it enters the viewport.
 * This hook uses the Intersection Observer API to detect when the loader element is visible.
 *
 * @param loaderRef - React ref object for the loader element
 * @param setIsLoading - Function to set the loading state
 */
export function useShowWhenInViewport(
	loaderRef: RefObject<HTMLDivElement>,
	setIsLoading: Dispatch<SetStateAction<boolean>>,
) {
	const noteContainerRef = useAtomValue(noteContainerRefAtom);
	useEffect(() => {
		if (!noteContainerRef?.current) return;
		// Create an observer to detect when the loader is in the viewport
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry.isIntersecting) {
					setIsLoading(false); // Set loading to false when spinner is in viewport
					observer.disconnect(); // Stop observing once the loader is visible
				}
			},
			{
				root: noteContainerRef.current,
				rootMargin: "0 0 400px 0",
				threshold: 0, // Trigger when 10% of the spinner is visible
			},
		);

		if (loaderRef.current) {
			observer.observe(loaderRef.current);
		}

		return () => {
			observer.disconnect();
		};
	}, [noteContainerRef]);
}
