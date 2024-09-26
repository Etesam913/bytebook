import { Browser } from "@wailsio/runtime";
import { toast } from "sonner";
import { DEFAULT_SONNER_OPTIONS } from "../../../utils/misc";

const URL_MATCHER =
	/((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

/** Opens the link in the browser when clicked */
export function handleATagClick(target: HTMLElement) {
	const parentElement = target.parentElement as HTMLLinkElement;
	if (parentElement.href.startsWith("wails://")) {
		return;
	}
	Browser.OpenURL(parentElement.href).catch(() => {
		toast.error("Failed to open link", DEFAULT_SONNER_OPTIONS);
	});
}

export const MATCHERS = [
	(text: string) => {
		const match = URL_MATCHER.exec(text);
		if (match === null) {
			return null;
		}
		const fullMatch = match[0];
		return {
			index: match.index,
			length: fullMatch.length,
			text: fullMatch,
			url: fullMatch.startsWith("http") ? fullMatch : `https://${fullMatch}`,
			// attributes: { rel: 'noreferrer', target: '_blank' }, // Optional link attributes
		};
	},
];
