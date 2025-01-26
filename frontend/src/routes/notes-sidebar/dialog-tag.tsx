import type { Dispatch, SetStateAction } from "react";
import { XMark } from "../../icons/circle-xmark";

export function DialogTag({
	tagName,
	setTags,
}: { tagName: string; setTags: Dispatch<SetStateAction<string[]>> }) {
	return (
		<span className="flex items-center text-xs rounded-full gap-2 px-2 py-1 bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600">
			{tagName}
			<button
				type="button"
				onClick={() => setTags((prev) => prev.filter((tag) => tag !== tagName))}
			>
				<XMark height={15} width={15} />
			</button>
			<input type="hidden" name="tags" value={tagName} />
		</span>
	);
}
