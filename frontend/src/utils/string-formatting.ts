import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const fileNameRegex = /^[0-9a-zA-Z_\-. ]+$/;

/**
 * Retrieves the value of a specific query parameter from a given URL string.
 *
 * @param fullString - The full URL string.
 * @param queryParamName - The name of the query parameter to retrieve the value for.
 * @returns The value of the query parameter if found, otherwise null.
 */
export function getQueryParamValue(fullString: string, queryParamName: string) {
	// Match the query string part of the URL
	const queryParamMatch = fullString.match(/\?.*$/);
	if (queryParamMatch) {
		// Extract the query string without the leading '?'
		const queryString = queryParamMatch[0].substring(1);
		const params = new URLSearchParams(queryString);
		// Get the value of the specified query parameter
		return params.get(queryParamName);
	}
	return null;
}

/**
 * Adds or updates a query parameter in a given URL string.
 *
 * @param fullString - The full URL string.
 * @param queryParamName - The name of the query parameter to add or update.
 * @param queryParamValue - The value of the query parameter to set.
 * @returns The updated URL string with the new or updated query parameter.
 */
export function addQueryParam(
	fullString: string,
	queryParamName: string,
	queryParamValue: string,
) {
	// Match the query string part of the URL
	const queryParamMatch = fullString.match(/\?.*$/);
	if (queryParamMatch) {
		// Extract the query string without the leading '?'
		const queryString = queryParamMatch[0].substring(1);
		const params = new URLSearchParams(queryString);
		// Set or update the specified query parameter
		params.set(queryParamName, queryParamValue);
		// Replace the old query string with the new one
		return fullString.replace(/\?.*$/, `?${params.toString()}`);
	}
	// If no query string exists, add the new query parameter
	return `${fullString}?${queryParamName}=${queryParamValue}`;
}

/**
 * Removes a specific query parameter from a given URL string.
 *
 * @param fullString - The full URL string.
 * @param queryParamName - The name of the query parameter to remove.
 * @returns The updated URL string with the query parameter removed.
 */
export function removeQueryParam(fullString: string, queryParamName: string) {
	// Match the query string part of the URL
	const queryParamMatch = fullString.match(/\?.*$/);
	if (queryParamMatch) {
		// Extract the query string without the leading '?'
		const queryString = queryParamMatch[0].substring(1);
		const params = new URLSearchParams(queryString);
		// Delete the specified query parameter
		params.delete(queryParamName);
		// Replace the old query string with the new one, handling the case where the query string is empty
		return fullString.replace(
			/\?.*$/,
			`${params.toString().length === 0 ? "" : "?"}${params.toString()}`,
		);
	}
	// If no query string exists, return the original URL
	return fullString;
}

/**
 * Checks if the given URL is an internal link.
 * An internal link is considered to be a URL that starts with "wails:".
 *
 * @param url - The URL to check.
 * @returns true if the URL is an internal link, false otherwise.
 */
export function isInternalLink(url: string) {
	return url.startsWith("wails:");
}

/**
 * Determines the type of internal link based on the URL.
 * Decodes the URL, parses it, and checks the segments of the pathname.
 *
 * @param url - The URL to analyze.
 * @returns An object with two properties:
 *          isNoteLink - true if the URL points to a note, determined by having 2 segments in the pathname.
 *          isFolderLink - true if the URL points to a folder, determined by having 1 segment in the pathname.
 */
export function getInternalLinkType(url: string) {
	const urlObj = new URL(url);

	// Split the pathname into segments.
	const segments = urlObj.pathname.split("/");
	// Remove the first segment as it's always empty (due to leading slash).
	segments.shift();

	// Determine the type of link based on the number of segments.
	return {
		isNoteLink: segments.length === 2,
		isFolderLink: segments.length === 1,
	};
}

interface ValidationResult {
	isValid: boolean;
	errorMessage?: string;
}

export const NAME_CHARS = /^[^<>:"/\\|?*]+$/;

/**
 * Validates name for create folder/note dialogs
 * @param name
 * @param nameType
 * @returns
 */
export function validateName(
	name: FormDataEntryValue | null,
	nameType: "folder" | "note",
): ValidationResult {
	if (!name) {
		return {
			isValid: false,
			errorMessage: `You cannot have an empty ${nameType} name`,
		};
	}

	const nameString = name.toString().trim();

	if (nameString.length === 0) {
		return {
			isValid: false,
			errorMessage: `You cannot have an empty ${nameType} name`,
		};
	}

	if (!NAME_CHARS.test(nameString)) {
		return {
			isValid: false,
			errorMessage: `Invalid ${nameType} name. Avoid special characters: <>:"/\\|?* and leading/trailing spaces.`,
		};
	}

	return {
		isValid: true,
	};
}
