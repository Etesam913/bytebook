import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	LexicalTypeaheadMenuPlugin,
	useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import type { UseMutationResult } from "@tanstack/react-query";

import {
	$createParagraphNode,
	$getSelection,
	$insertNodes,
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
	useState,
} from "react";
import { createPortal } from "react-dom";
import { AngularLogo } from "../../../icons/angular-logo";
import { CppLogo } from "../../../icons/cpp-logo";
import { GolangLogo } from "../../../icons/golang-logo";
import { Heading1 } from "../../../icons/heading-1";
import { Heading2 } from "../../../icons/heading-2";
import { Heading3 } from "../../../icons/heading-3";
import { Heading4 } from "../../../icons/heading-4";
import { Heading5 } from "../../../icons/heading-5";
import { Heading6 } from "../../../icons/heading-6";
import { JavaLogo } from "../../../icons/java-logo";
import { JavascriptLogo } from "../../../icons/javascript-logo";
import LabelPlus from "../../../icons/label-plus";
import { Paintbrush } from "../../../icons/paintbrush";
import { PythonLogo } from "../../../icons/python-logo";
import { ReactLogo } from "../../../icons/react-logo";
import { RustLogo } from "../../../icons/rust-logo";
import { SvelteLogo } from "../../../icons/svelte-logo";
import { TerminalIcon } from "../../../icons/terminal";
import { Text } from "../../../icons/text";
import { VideoIcon } from "../../../icons/video";
import { VueLogo } from "../../../icons/vue-logo";
import type { DialogDataType } from "../../../types";
import {
	DropdownPickerMenuItem,
	DropdownPickerOption,
} from "../../dropdown/dropdown-picker";
import { YouTubeDialogChildren } from "../../youtube/youtube-dialog-children";
import { $createExcalidrawNode } from "../nodes/excalidraw";
import { $createFileNode } from "../nodes/file";
import { extractYouTubeVideoID } from "../utils/file-node";
import { attachmentCommandData, listCommandData } from "../utils/toolbar";
import { INSERT_CODE_COMMAND } from "./code";
import { FOCUS_NODE_COMMAND } from "./focus";
import { SAVE_MARKDOWN_CONTENT } from "./save";

const languageCommandData: {
	id:
		| "go"
		| "java"
		| "python"
		| "javascript"
		| "react"
		| "angular"
		| "vue"
		| "svelte"
		| "rust"
		| "cpp"
		| "c"
		| "terminal";
	name: string;
	keywords: string[];
	icon?: JSX.Element;
}[] = [
	{
		id: "go",
		keywords: ["go", "google"],
		icon: <GolangLogo />,
		name: "Golang",
	},
	{
		id: "java",
		keywords: ["java", "coffee"],
		icon: <JavaLogo />,
		name: "Java",
	},
	{
		id: "python",
		keywords: ["python", "py"],
		icon: <PythonLogo />,
		name: "Python",
	},
	{
		id: "javascript",
		keywords: ["javascript", "js"],
		icon: <JavascriptLogo />,
		name: "Javascript",
	},
	{
		id: "react",
		keywords: ["javascript", "react", "jsx"],
		icon: <ReactLogo />,
		name: "React",
	},
	{ id: "rust", keywords: ["rust", "rs"], icon: <RustLogo />, name: "Rust" },
	{ id: "cpp", keywords: ["c++", "cpp"], icon: <CppLogo />, name: "C++" },
	{ id: "c", keywords: ["c", "c++", "clang"], icon: <CppLogo />, name: "C" },
	{
		id: "angular",
		keywords: ["javascript", "angular", "js", "google"],
		icon: <AngularLogo />,
		name: "Angular",
	},
	{
		id: "vue",
		keywords: ["javascript", "vue", "js"],
		icon: <VueLogo />,
		name: "Vue",
	},
	{
		id: "svelte",
		keywords: ["javascript", "svelte", "js"],
		icon: <SvelteLogo height="17" width="17" />,
		name: "Svelte",
	},
	{
		id: "terminal",
		keywords: ["terminal", "command", "prompt", "bash", "zsh", "sh"],
		icon: <TerminalIcon />,
		name: "Terminal",
	},
];

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
