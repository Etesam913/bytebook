/**
 * Calculates the time difference between two dates and returns it in a human-readable format.
 *
 * @param date1 - The earlier date.
 * @param date2 - The later date.
 * @returns A string representing the time difference in the largest applicable unit (e.g., "2 years", "3 days").
 */
export function timeSince(date1: Date, date2: Date): string {
	// Calculate the difference in seconds between the two dates
	const seconds = Math.floor((date2.getTime() - date1.getTime()) / 1000);

	// Define intervals in seconds for years, months, days, hours, and minutes
	const intervals = [
		{ label: "years", seconds: 31536000 },
		{ label: "months", seconds: 2592000 },
		{ label: "days", seconds: 86400 },
		{ label: "hours", seconds: 3600 },
		{ label: "minutes", seconds: 60 },
	];

	// Loop through each interval to find the largest applicable unit of time
	for (const { label, seconds: intervalSeconds } of intervals) {
		const interval = Math.floor(seconds / intervalSeconds);
		// If the interval is greater than 1, return the time difference in this unit
		if (interval >= 1) {
			if (interval === 1) {
				return `${interval} ${label.slice(0, -1)}`;
			}
			return `${interval} ${label}`;
		}
	}

	// If none of the larger intervals apply, return the time difference in seconds
	return `${Math.floor(seconds)} seconds`;
}
