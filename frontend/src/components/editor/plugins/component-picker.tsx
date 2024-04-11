import { INSERT_ORDERED_LIST_COMMAND } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	LexicalTypeaheadMenuPlugin,
	MenuOption,
	useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { motion } from "framer-motion";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_NORMAL,
	type LexicalEditor,
	type TextNode,
} from "lexical";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { OrderedList } from "../../../icons/ordered-list";
import { cn } from "../../../utils/string-formatting";
import { listCommandData } from "../toolbar";

class ComponentPickerOption extends MenuOption {
	// What shows up in the editor
	title: string;
	// Icon for display
	icon?: JSX.Element;
	// For extra searching.
	keywords: Array<string>;
	// TBD
	keyboardShortcut?: string;
	// What happens when you select this option?
	onSelect: (queryString: string) => void;

	constructor(
		title: string,
		options: {
			icon?: JSX.Element;
			keywords?: Array<string>;
			keyboardShortcut?: string;
			onSelect: (queryString: string) => void;
		},
	) {
		super(title);
		this.title = title;
		this.keywords = options.keywords || [];
		this.icon = options.icon;
		this.keyboardShortcut = options.keyboardShortcut;
		this.onSelect = options.onSelect.bind(this);
	}
}

function ComponentPickerMenuItem({
	index,
	isSelected,
	onClick,
	onMouseEnter,
	option,
}: {
	index: number;
	isSelected: boolean;
	onClick: () => void;
	onMouseEnter: () => void;
	option: ComponentPickerOption;
}) {
	return (
		<li
			key={option.key}
			tabIndex={-1}
			className={cn(
				"flex items-center gap-2 text-left cursor-pointer rounded-md px-[7px] py-[2px] transition-colors hover:bg-zinc-150 focus:bg-zinc-150 dark:hover:bg-zinc-600 dark:focus:bg-zinc-600",
				isSelected && "bg-zinc-150 dark:bg-zinc-600",
			)}
			ref={option.setRefElement}
			role="option"
			aria-selected={isSelected}
			id={"typeahead-item-" + index}
			onMouseEnter={onMouseEnter}
			onClick={onClick}
		>
			{option.icon}
			<span className="text">{option.title}</span>
		</li>
	);
}

function getBaseOptions(editor: LexicalEditor) {
	return [
		new ComponentPickerOption("Paragraph", {
			keywords: ["normal", "paragraph", "p", "text"],
			onSelect: () =>
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createParagraphNode());
					}
				}),
		}),
		...([1, 2, 3] as const).map(
			(n) =>
				new ComponentPickerOption(`Heading ${n}`, {
					keywords: ["heading", "header", `h${n}`],
					onSelect: () =>
						editor.update(() => {
							const selection = $getSelection();
							if ($isRangeSelection(selection)) {
								$setBlocksType(selection, () => $createHeadingNode(`h${n}`));
							}
						}),
				}),
		),
		...listCommandData.map(({ block, icon, command, title }) => {
			return new ComponentPickerOption(title, {
				icon,
				keywords: ["list", block, title],
				onSelect: () => {
					editor.update(() => {
						editor.dispatchCommand(command, undefined);
					});
				},
			});
		}),
	];
}

export function ComponentPickerMenuPlugin(): JSX.Element {
	const [editor] = useLexicalComposerContext();

	const [queryString, setQueryString] = useState<string | null>(null);

	const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
		minLength: 0,
	});

	const options = useMemo(() => {
		const baseOptions = getBaseOptions(editor);

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
	}, [editor, queryString]);

	const onSelectOption = useCallback(
		(
			selectedOption: ComponentPickerOption,
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
		<>
			<LexicalTypeaheadMenuPlugin<ComponentPickerOption>
				onQueryChange={setQueryString}
				commandPriority={COMMAND_PRIORITY_NORMAL}
				onSelectOption={onSelectOption}
				triggerFn={checkForTriggerMatch}
				options={options}
				menuRenderFn={(
					anchorElementRef,
					{ selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
				) =>
					anchorElementRef.current && options.length
						? createPortal(
								<ul className="fixed flex flex-col gap-0.5 w-48 p-1 shadow-xl rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700">
									{options.map((option, i: number) => (
										<ComponentPickerMenuItem
											index={i}
											isSelected={selectedIndex === i}
											onClick={() => {
												setHighlightedIndex(i);
												selectOptionAndCleanUp(option);
											}}
											onMouseEnter={() => {
												setHighlightedIndex(i);
											}}
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
		</>
	);
}
