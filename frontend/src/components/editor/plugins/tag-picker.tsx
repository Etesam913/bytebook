import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	LexicalTypeaheadMenuPlugin,
	useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";

import { COMMAND_PRIORITY_NORMAL, type TextNode } from "lexical";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
	DropdownPickerMenuItem,
	DropdownPickerOption,
} from "../../dropdown/dropdown-picker";

// TODO: Add tags here from state
function getBaseOptions() {
	return [
		new DropdownPickerOption("Test", { onSelect: () => {} }),
	] as DropdownPickerOption[];
}

export function TagPickerPlugin({
	folder,
	note,
}: { folder: string; note: string }): JSX.Element {
	const [editor] = useLexicalComposerContext();
	const [queryString, setQueryString] = useState<string | null>(null);

	const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("#", {
		minLength: 0,
	});

	const options = useMemo(() => {
		const baseOptions = getBaseOptions();

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
