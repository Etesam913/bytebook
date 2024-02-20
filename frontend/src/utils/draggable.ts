export function dragSpacer(
	onDragCallback: (e: MouseEvent) => void,
	onDragEndCallback: () => void,
) {
	function mouseMove(e: MouseEvent) {
		if (e.target) {
			onDragCallback(e);
		}
	}

	function cleanUpDocumentEvents() {
		document.removeEventListener("mousemove", mouseMove);
		document.removeEventListener("mouseup", cleanUpDocumentEvents);
		// document.removeEventListener("selectstart", (e) => e.preventDefault());
		document.body.style.cursor = "auto";
		onDragEndCallback();
	}
	// document.addEventListener("selectstart", (e) => e.preventDefault());
	document.addEventListener("mousemove", mouseMove);
	document.addEventListener("mouseup", cleanUpDocumentEvents);
	document.body.style.cursor = "ew-resize";
}

// biome-ignore lint/suspicious/noExplicitAny: any is fine for throttle function
export function throttle<T extends (...args: any[]) => any>(
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

// biome-ignore lint/suspicious/noExplicitAny: any is fine for debounce function
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
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
