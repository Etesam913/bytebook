import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	LexicalTypeaheadMenuPlugin,
	MenuOption,
	useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	$setSelection,
	type BaseSelection,
	COMMAND_PRIORITY_NORMAL,
	type LexicalEditor,
	type TextNode,
} from "lexical";
import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../utils/string-formatting";

import { useSetAtom } from "jotai";
import { dialogDataAtom } from "../../../atoms";
import { useBackendFunction } from "../../../hooks/query";
import { AngularLogo } from "../../../icons/angular-logo";
import { SvelteLogo } from "../../../icons/svelte-logo";
import { VueLogo } from "../../../icons/vue-logo";
import type { DialogDataType } from "../../../types";
import { resetDialogState } from "../../dialog";
import { YouTubeDialogChildren } from "../../youtube/youtube-dialog-children";
import { $createFileNode } from "../nodes/file";
import { extractYouTubeVideoID } from "../utils/file-node";
import {
	attachmentCommandData,
	insertAttachmentFromFile,
	listCommandData,
} from "../utils/toolbar";
import { INSERT_CODE_COMMAND } from "./code";

const languageCommandData: {
	name:
		| "go"
		| "java"
		| "python"
		| "javascript"
		| "react"
		| "angular"
		| "vue"
		| "svelte"
		| "rust"
		| "cpp";
	keywords: string[];
	icon?: JSX.Element;
}[] = [
	{ name: "go", keywords: ["go", "google"] },
	{ name: "java", keywords: ["java", "coffee"] },
	{ name: "python", keywords: ["python", "py"] },
	{ name: "javascript", keywords: ["javascript", "js"] },
	{ name: "react", keywords: ["javascript", "react", "jsx"] },
	{ name: "rust", keywords: ["rust", "rs"] },
	{ name: "cpp", keywords: ["c++", "cpp"] },
	{
		name: "angular",
		keywords: ["javascript", "angular", "js"],
		icon: <AngularLogo height="17" width="17" />,
	},
	{
		name: "vue",
		keywords: ["javascript", "vue", "js"],
		icon: <VueLogo height="17" width="17" />,
	},
	{
		name: "svelte",
		keywords: ["javascript", "svelte", "js"],
		icon: <SvelteLogo height="17" width="17" />,
	},
];

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
				"flex items-center gap-2 text-left cursor-pointer rounded-md px-[7px] py-[2px] hover:bg-zinc-150 focus:bg-zinc-150 dark:hover:bg-zinc-600 dark:focus:bg-zinc-600",
				isSelected && "bg-zinc-150 dark:bg-zinc-600",
			)}
			ref={option.setRefElement}
			aria-selected={isSelected}
			id={`typeahead-item-${index}`}
			onMouseEnter={onMouseEnter}
			onClick={onClick}
		>
			{option.icon}
			<span className="text">{option.title}</span>
		</li>
	);
}

function getBaseOptions(
	editor: LexicalEditor,
	folder: string,
	note: string,
	insertAttachments: (
		folder: string,
		note: string,
		editor: LexicalEditor,
	) => Promise<unknown>,
	dialogProps: {
		setDialogData: Dispatch<SetStateAction<DialogDataType>>;
		editorSelection: RefObject<BaseSelection | null>;
	},
) {
	const { setDialogData, editorSelection } = dialogProps;

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
		new ComponentPickerOption("Attachments", {
			icon: attachmentCommandData.icon,
			keywords: [
				"image",
				"picture",
				"video",
				"file",
				"clip",
				attachmentCommandData.block,
				"picture",
			],
			onSelect: async () => {
				insertAttachments(folder, note, editor);
			},
		}),
		new ComponentPickerOption("YouTube", {
			keywords: ["youtube", "video", "embed"],
			onSelect: async () => {
				setDialogData({
					isOpen: true,
					dialogClassName: "w-[min(30rem,90vw)]",
					title: "YouTube Embed",
					children: (dialogErrorText) => (
						<YouTubeDialogChildren
							editor={editor}
							errorText={dialogErrorText}
							editorSelection={editorSelection}
						/>
					),
					onSubmit: (e, setDialogErrorText) => {
						try {
							if (
								!editorSelection.current ||
								!$isRangeSelection(editorSelection.current)
							)
								throw new Error("Something went wrong! Please try again.");

							const formData = new FormData(e.target as HTMLFormElement);
							const videoUrl = formData.get("youtube-url");
							// Doing some error checking
							if (!videoUrl || typeof videoUrl !== "string")
								throw new Error("YouTube URL cannot be empty");
							if (videoUrl.trim().length === 0)
								throw new Error("YouTube URL cannot be empty");
							if (extractYouTubeVideoID(videoUrl) === null)
								throw new Error("Invalid YouTube URL");

							// Got a warning about the old selection being stale, so cloning it fixes it
							const newSelection = editorSelection.current.clone();
							// Using the cloned selection and adding the youtube video
							editor.update(() => {
								$setSelection(newSelection);
								const youtubeVideo = $createFileNode({
									alt: "YouTube Video",
									src: videoUrl,
									width: "100%",
									elementType: "youtube",
								});
								const youtubeVideoNode = $createParagraphNode();
								youtubeVideoNode.append(youtubeVideo);
								newSelection.insertNodes([youtubeVideoNode]);
							});
							resetDialogState(setDialogErrorText, setDialogData);
						} catch (e) {
							if (e instanceof Error) setDialogErrorText(e.message);
						}
					},
				});
			},
		}),
		...languageCommandData.map(
			({ name, keywords, icon }) =>
				new ComponentPickerOption(name, {
					icon,
					keywords: [...keywords, "code", "syntax", "programming", "language"],
					onSelect: async () => {
						editor.update(() => {
							editor.dispatchCommand(INSERT_CODE_COMMAND, {
								language: name,
								focus: true,
							});
						});
					},
				}),
		),
	];
}

export function ComponentPickerMenuPlugin({
	folder,
	note,
}: { folder: string; note: string }): JSX.Element {
	const [editor] = useLexicalComposerContext();
	const editorSelection = useRef<BaseSelection | null>(null);
	const [queryString, setQueryString] = useState<string | null>(null);

	const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
		minLength: 0,
	});

	const insertAttachments = useBackendFunction(
		insertAttachmentFromFile,
		"Inserting Attachments...",
	);

	const setDialogData = useSetAtom(dialogDataAtom);

	const options = useMemo(() => {
		const baseOptions = getBaseOptions(
			editor,
			folder,
			note,
			insertAttachments,
			{ setDialogData, editorSelection },
		);

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
								<ul className="fixed flex overflow-auto flex-col max-h-56 gap-0.5 w-48 p-1 shadow-xl rounded-md border-[1.25px] border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700">
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
