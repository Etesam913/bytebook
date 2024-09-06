import type { LexicalEditor } from "lexical";
import type { Dispatch, SetStateAction } from "react";
import { RefreshAnticlockwise } from "../../../icons/refresh-anticlockwise";
import { SAVE_MARKDOWN_CONTENT } from "../plugins/save";

export function FontFamilyInput({
	frontmatter,
	setFrontmatter,
	editor,
	disabled,
}: {
	frontmatter: Record<string, string>;
	setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>;
	editor: LexicalEditor;
	disabled: boolean;
}) {
	return (
		<div className="relative">
			<input
				className="bg-zinc-150 dark:bg-zinc-700 rounded-md outline outline-offset-0 outline-2 focus-visible:outline-blue-400 dark:focus-visible:outline-blue-500 outline-zinc-300 dark:outline-zinc-600 py-1 px-2 text-xs ml-1 w-48"
				spellCheck={false}
				autoComplete="off"
				placeholder="Font Family"
				value={frontmatter.fontFamily ?? "Bricolage Grotesque"}
				onBlur={() => {
					editor.update(
						() => {
							editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, undefined);
						},
						{ tag: "note:changed-from-other-window" },
					);
				}}
				onChange={(e) => {
					setFrontmatter((prev) => ({
						...prev,
						fontFamily: e.target.value,
					}));
				}}
			/>
			<button
				type="button"
				disabled={disabled || frontmatter.fontFamily === "Bricolage Grotesque"}
				onClick={() => {
					setFrontmatter((prev) => ({
						...prev,
						fontFamily: "Bricolage Grotesque",
					}));
				}}
				className="absolute right-2 top-1/2 -translate-y-[42.5%] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 disabled:hover:text-zinc-500 disabled:hover:dark:text-zinc-400"
			>
				<RefreshAnticlockwise height="0.7rem" width="0.7rem" />
			</button>
		</div>
	);
}
