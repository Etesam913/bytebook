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
// biome-ignore lint/complexity/noBannedTypes: General types are suitable for a throttle function
export const throttle = (fn: Function, wait = 300) => {
	let inThrottle: boolean;
	let lastFn: ReturnType<typeof setTimeout>;
	let lastTime: number;

	// biome-ignore lint/suspicious/noExplicitAny: `any` is ok here because we don't know the type of `this`
	return function (this: any) {
		// biome-ignore lint/style/noArguments: `arguments` is ok here as this function won't be modified for the future
		const args = arguments;
		if (!inThrottle) {
			fn.apply(this, args);
			lastTime = Date.now();
			inThrottle = true;
		} else {
			clearTimeout(lastFn);
			lastFn = setTimeout(
				() => {
					if (Date.now() - lastTime >= wait) {
						fn.apply(this, args);
						lastTime = Date.now();
					}
				},
				Math.max(wait - (Date.now() - lastTime), 0),
			);
		}
	};
};

// biome-ignore lint/complexity/noBannedTypes: General types are suitable for a debounce function
export const debounce = (fn: Function, ms = 300) => {
	// @ts-ignore
	let timeoutId: ReturnType<typeof setTimeout>;
	// biome-ignore lint/suspicious/noExplicitAny: `any` is ok here because we don't know the type of `this`
	return function (this: any, ...args: any[]) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn.apply(this, args), ms);
	};
};
