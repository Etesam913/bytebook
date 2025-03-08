export const FILE_SERVER_URL = "http://localhost:5890";

export const DEFAULT_SONNER_OPTIONS = {
	dismissible: true,
	duration: 2000,
	closeButton: true,
};

export const MAX_SIDEBAR_WIDTH = 230;

/**
 * Format bytes as human-readable text.
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
export function humanFileSize(bytes: number, si = false, dp = 1): string {
	const thresh = si ? 1000 : 1024;

	if (Math.abs(bytes) < thresh) {
		return `${bytes} B`;
	}

	const units = si
		? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
		: ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
	let u = -1;
	let size = bytes;
	const r = 10 ** dp;

	do {
		size /= thresh;
		++u;
	} while (
		Math.round(Math.abs(size) * r) / r >= thresh &&
		u < units.length - 1
	);

	return `${size.toFixed(dp)} ${units[u]}`;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const debounce = (fn: Function, ms = 300) => {
	let timeoutId: ReturnType<typeof setTimeout>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (this: any, ...args: any[]) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn.apply(this, args), ms);
	};
};
