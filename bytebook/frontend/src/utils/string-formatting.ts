import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const fileNameRegex = /^[0-9a-zA-Z_\-. ]+$/;

export function getQueryParamValue(fullString: string, queryParamName: string) {
	const queryParamMatch = fullString.match(/\?.*$/);
	if (queryParamMatch) {
		const queryString = queryParamMatch[0].substring(1); // Remove the '?' at the start
		const params = new URLSearchParams(queryString);
		return params.get(queryParamName);
	}
	return null;
}

export function addQueryParam(
	fullString: string,
	queryParamName: string,
	queryParamValue: string,
) {
	const queryParamMatch = fullString.match(/\?.*$/);
	if (queryParamMatch) {
		const queryString = queryParamMatch[0].substring(1); // Remove the '?' at the start
		const params = new URLSearchParams(queryString);
		params.set(queryParamName, queryParamValue);
		return fullString.replace(/\?.*$/, `?${params.toString()}`);
	}
	return `${fullString}?${queryParamName}=${queryParamValue}`;
}

export function removeQueryParam(fullString: string, queryParamName: string) {
	const queryParamMatch = fullString.match(/\?.*$/);
	if (queryParamMatch) {
		const queryString = queryParamMatch[0].substring(1); // Remove the '?' at the start
		const params = new URLSearchParams(queryString);
		params.delete(queryParamName);
		return fullString.replace(
			/\?.*$/,
			`${params.toString().length === 0 ? "" : "?"}${params.toString()}`,
		);
	}
	return fullString;
}
