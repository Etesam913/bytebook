function stopSelect(e: Event) {
	e.preventDefault();
}

export function dragItem(
	onDragCallback: (e: MouseEvent) => void,
	onDragEndCallback?: (e: MouseEvent) => void,
) {
	function mouseMove(e: MouseEvent) {
		if (e.target) {
			onDragCallback(e);
		}
	}

	function cleanUpDocumentEvents(e: MouseEvent) {
		document.removeEventListener("mousemove", mouseMove);
		document.removeEventListener("mouseup", cleanUpDocumentEvents);

		document.removeEventListener("selectstart", stopSelect);

		if (onDragEndCallback) {
			onDragEndCallback(e);
		}
	}
	document.addEventListener("selectstart", stopSelect);
	document.body.style.userSelect = "none";
	document.addEventListener("mousemove", mouseMove);
	document.addEventListener("mouseup", cleanUpDocumentEvents);
}

export function throttle<T extends (...args: unknown[]) => unknown>(
	func: T,
	limit: number,
): (...funcArgs: Parameters<T>) => void {
	let inThrottle: boolean;
	let lastFunc: ReturnType<typeof setTimeout>;
	let lastRan: number;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			lastRan = Date.now();
			inThrottle = true;
		} else {
			clearTimeout(lastFunc);
			lastFunc = setTimeout(
				() => {
					if (Date.now() - lastRan >= limit) {
						func(...args);
						lastRan = Date.now();
					}
				},
				limit - (Date.now() - lastRan),
			);
		}
	};
}

export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			func(...args);
		}, wait);
	};
}
