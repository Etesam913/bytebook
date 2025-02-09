import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { AnimationControls } from "framer-motion";
import { useAtom } from "jotai/react";
import type { TextFormatType } from "lexical";
import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useEffect,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { WINDOW_ID } from "../../../App";
import { isNoteMaximizedAtom, isToolbarDisabledAtom } from "../../../atoms";
import { useAttachmentsMutation } from "../../../hooks/attachments";
import type { EditorBlockTypes, FloatingDataType } from "../../../types";
import { useIsStandalone, useWailsEvent } from "../../../utils/hooks";
import { cn } from "../../../utils/string-formatting";
import { MaximizeNoteButton } from "../../buttons/maximize-note";
import { ToolbarButtons } from "../../buttons/toolbar";
import { Dropdown } from "../../dropdown";
import { useNoteMarkdown, useToolbarEvents } from "../hooks/toolbar";
import { FloatingMenuPlugin } from "../plugins/floating-menu";
import { CUSTOM_TRANSFORMERS } from "../transformers";
import { $convertFromMarkdownStringCorrect } from "../utils/note-metadata";
import {
	blockTypesDropdownItems,
	changeSelectedBlocksType,
} from "../utils/toolbar";
import { FontFamilyInput } from "./font-family-input";
import { SettingsDropdown } from "./settings-dropdown";

export function Toolbar({
	folder,
	note,
	floatingData,
	setFloatingData,
	noteContainerRef,
	animationControls,
	frontmatter,
	setFrontmatter,
	setNoteMarkdownString,
}: {
	folder: string;
	note: string;
	floatingData: FloatingDataType;
	setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
	animationControls: AnimationControls;
	noteContainerRef: RefObject<HTMLDivElement | null>;
	frontmatter: Record<string, string>;
	setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>;
	setNoteMarkdownString: Dispatch<SetStateAction<string>>;
}) {
	const [editor] = useLexicalComposerContext();
	const [disabled, setDisabled] = useAtom(isToolbarDisabledAtom);
	const [currentBlockType, setCurrentBlockType] =
		useState<EditorBlockTypes>("paragraph");
	const [currentSelectionFormat, setCurrentSelectionFormat] = useState<
		TextFormatType[]
	>([]);

	const [isNoteMaximized, setIsNoteMaximized] = useAtom(isNoteMaximizedAtom);
	const [isNodeSelection, setIsNodeSelection] = useState(false);
	const [canRedo, setCanRedo] = useState(false);
	const [canUndo, setCanUndo] = useState(false);

	const { insertAttachmentsMutation } = useAttachmentsMutation({
		folder,
		note,
		editor,
	});

	useNoteMarkdown(
		editor,
		folder,
		note,
		setCurrentSelectionFormat,
		setFrontmatter,
		setNoteMarkdownString,
	);

	// useMutationListener(editor, folder, note, frontmatter);

	useWailsEvent("note:changed", (e) => {
		const data = e.data as {
			folder: string;
			note: string;
			markdown: string;
			oldWindowAppId: string;
		};
		const {
			folder: folderName,
			note: noteName,
			markdown,
			oldWindowAppId,
		} = data;
		if (
			folderName === folder &&
			noteName === note &&
			oldWindowAppId !== WINDOW_ID
		) {
			editor.update(
				() => {
					$convertFromMarkdownStringCorrect(
						markdown,
						CUSTOM_TRANSFORMERS,
						setFrontmatter,
					);
				},
				{ tag: "note:changed-from-other-window" },
			);
		}
	});

	useToolbarEvents(
		editor,
		setDisabled,
		setCurrentSelectionFormat,
		setCurrentBlockType,
		setCanUndo,
		setCanRedo,
		setIsNodeSelection,
		setFloatingData,
		noteContainerRef,
	);

	// useFileDropEvent(editor, folder, note);
	// TODO: I think this is not needed anymore
	const isStandalone = useIsStandalone();

	useEffect(() => {
		if (isStandalone) {
			setIsNoteMaximized(true);
		}
	}, [isStandalone]);

	const FloatingPlugin = noteContainerRef.current ? (
		createPortal(
			<FloatingMenuPlugin
				floatingData={floatingData}
				setFloatingData={setFloatingData}
			>
				<ToolbarButtons
					canUndo={canUndo}
					canRedo={canRedo}
					disabled={disabled}
					isNodeSelection={isNodeSelection}
					currentBlockType={currentBlockType}
					setCurrentBlockType={setCurrentBlockType}
					currentSelectionFormat={currentSelectionFormat}
					setCurrentSelectionFormat={setCurrentSelectionFormat}
				/>
			</FloatingMenuPlugin>,
			noteContainerRef.current,
		)
	) : (
		<></>
	);

	return (
		<>
			{FloatingPlugin}
			<nav
				className={cn(
					"ml-[-4px] flex gap-1.5 border-b-[1px] border-b-zinc-200 px-2 pb-2 pt-2.5 dark:border-b-zinc-700",
					isNoteMaximized && "!pl-[5.75rem]",
				)}
			>
				<span className="flex items-center gap-1.5">
					<MaximizeNoteButton
						animationControls={animationControls}
						disabled={disabled}
					/>
					<Dropdown
						controlledValueIndex={blockTypesDropdownItems.findIndex(
							(v) => v.value === currentBlockType,
						)}
						onChange={({ value }) =>
							changeSelectedBlocksType(editor, value, insertAttachmentsMutation)
						}
						items={blockTypesDropdownItems}
						buttonClassName="w-[10rem]"
						disabled={disabled}
					/>
					<FontFamilyInput
						frontmatter={frontmatter}
						setFrontmatter={setFrontmatter}
						editor={editor}
						disabled={disabled}
					/>
				</span>
				<ToolbarButtons
					canUndo={canUndo}
					canRedo={canRedo}
					disabled={disabled}
					isNodeSelection={isNodeSelection}
					currentBlockType={currentBlockType}
					setCurrentBlockType={setCurrentBlockType}
					currentSelectionFormat={currentSelectionFormat}
					setCurrentSelectionFormat={setCurrentSelectionFormat}
					shouldShowUndoRedo
				/>
				<SettingsDropdown
					folder={folder}
					note={note}
					isToolbarDisabled={disabled}
					frontmatter={frontmatter}
				/>
			</nav>
		</>
	);
}
