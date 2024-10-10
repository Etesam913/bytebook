import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	LexicalTypeaheadMenuPlugin,
	useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";

import {
	$insertNodes,
	COMMAND_PRIORITY_NORMAL,
	type LexicalEditor,
	type TextNode,
} from "lexical";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useAtomValue } from "jotai/react";
import { tagsAtom } from "../../../atoms";
import { TagIcon } from "../../../icons/tag";
import {
	DropdownPickerMenuItem,
	DropdownPickerOption,
} from "../../dropdown/dropdown-picker";
import { $createTagNode } from "../nodes/tag";

/**
 * Generates a list of dropdown options for tag selection.
 * Each option includes a tag name, an icon, and an onSelect handler
 * that inserts a tag node into the editor when the option is selected.
 *
 * @param  editor - The Lexical editor instance.
 * @param  tags - An array of tag names to create options for.
 * @returns A list of dropdown picker options.
 */
function getBaseOptions(editor: LexicalEditor, tags: string[]) {
	return tags
		.map((tagName) => {
			return new DropdownPickerOption(tagName, {
				onSelect: () => {
					editor.update(() => {
						const tagNode = $createTagNode({ tag: tagName });
						$insertNodes([tagNode]);
					});
				},
				icon: <TagIcon />,
			});
		})
		.slice(0, 10);
}

export function TagPickerPlugin({
	folder,
	note,
}: { folder: string; note: string }): JSX.Element {
	const [editor] = useLexicalComposerContext();
	const [queryString, setQueryString] = useState<string | null>(null);
	const tags = useAtomValue(tagsAtom);
	const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("#", {
		minLength: 0,
	});

	const options = useMemo(() => {
		const baseOptions = getBaseOptions(editor, tags ?? []);

		if (!queryString) {
			return baseOptions;
		}

		const regex = new RegExp(queryString, "i");

		return [
			...baseOptions.filter(
				(option) =>
					regex.test(option.title) ||
					option.keywords.some((keyword) => regex.test(keyword)),
			),
		];
	}, [editor, queryString, folder, note]);

	const onSelectOption = useCallback(
		(
			selectedOption: DropdownPickerOption,
			nodeToRemove: TextNode | null,
			closeMenu: () => void,
			matchingString: string,
		) => {
			editor.update(() => {
				nodeToRemove?.remove();
				selectedOption.onSelect(matchingString);
				closeMenu();
			});
		},
		[editor],
	);

	return (
		<LexicalTypeaheadMenuPlugin<DropdownPickerOption>
			onQueryChange={setQueryString}
			commandPriority={COMMAND_PRIORITY_NORMAL}
			onSelectOption={onSelectOption}
			triggerFn={checkForTriggerMatch}
			options={options}
			menuRenderFn={(
				anchorElementRef,
				{ selectedIndex, selectOptionAndCleanUp },
			) =>
				anchorElementRef.current && options.length
					? createPortal(
							<ul className="fixed z-10 flex overflow-auto flex-col max-h-56 gap-0.5 w-48 p-1 shadow-xl rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 scroll-p-1">
								{options.map((option, i: number) => (
									<DropdownPickerMenuItem
										index={i}
										isSelected={selectedIndex === i}
										onMouseEnter={() => {}}
										onClick={() => selectOptionAndCleanUp(option)}
										key={option.key}
										option={option}
									/>
								))}
							</ul>,
							anchorElementRef.current,
						)
					: null
			}
		/>
	);
}
