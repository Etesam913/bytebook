import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { type SetStateAction, useAtom, useAtomValue } from "jotai";
import type { TextFormatType } from "lexical";
import { type Dispatch, useEffect, useState } from "react";
import { WINDOW_ID } from "../../App";
import { easingFunctions, getDefaultButtonVariants } from "../../animations";
import {
	attachmentsAtom,
	isNoteMaximizedAtom,
	isToolbarDisabled,
} from "../../atoms";

import type { AnimationControls } from "framer-motion";
import { createPortal } from "react-dom";
import { SidebarRightCollapse } from "../../icons/sidebar-right-collapse";
import type { EditorBlockTypes, FloatingDataType } from "../../types";
import { useIsStandalone, useWailsEvent } from "../../utils/hooks";
import { cn } from "../../utils/string-formatting";
import { MotionIconButton } from "../buttons";
import { ToolbarButtons } from "../buttons/toolbar";
import { Dropdown } from "../dropdown";
import { useNoteMarkdown, useToolbarEvents } from "./hooks";
import { FloatingMenuPlugin } from "./plugins/floating-menu";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import {
	$convertFromMarkdownStringCorrect,
	blockTypesDropdownItems,
	changeSelectedBlocksType,
} from "./utils";

interface ToolbarProps {
	folder: string;
	note: string;
	floatingData: FloatingDataType;
	setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
	editorAnimationControls: AnimationControls;
	noteContainerRef: React.RefObject<HTMLDivElement>;
	setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>;
}

export function Toolbar({
	folder,
	note,
	floatingData,
	setFloatingData,
	noteContainerRef,
	editorAnimationControls,
	setFrontmatter,
}: ToolbarProps) {
	const [editor] = useLexicalComposerContext();
	const [disabled, setDisabled] = useAtom(isToolbarDisabled);
	const [currentBlockType, setCurrentBlockType] =
		useState<EditorBlockTypes>("paragraph");
	const [currentSelectionFormat, setCurrentSelectionFormat] = useState<
		TextFormatType[]
	>([]);
	const [isNoteMaximized, setIsNoteMaximized] = useAtom(isNoteMaximizedAtom);
	const [isNodeSelection, setIsNodeSelection] = useState(false);
	const [canRedo, setCanRedo] = useState(false);
	const [canUndo, setCanUndo] = useState(false);

	const attachments = useAtomValue(attachmentsAtom);

	useNoteMarkdown(
		editor,
		folder,
		note,
		setCurrentSelectionFormat,
		setFrontmatter,
	);

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
		folder,
	);

	// useFileDropEvent(editor, folder, note);

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
					setFloatingData={setFloatingData}
					noteContainerRef={noteContainerRef}
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
					"ml-[-4px] flex gap-1.5 border-b-[1px] border-b-zinc-200 p-2 dark:border-b-zinc-700 flex-wrap",
					isNoteMaximized && "!pl-[5.75rem]",
				)}
			>
				<span className="flex items-center gap-1.5">
					<MotionIconButton
						onClick={() => {
							setIsNoteMaximized((prev) => !prev);
							editorAnimationControls.start({
								x: isNoteMaximized ? [-40, 0] : [50, 0],
								transition: { ease: easingFunctions["ease-out-quint"] },
							});
						}}
						{...getDefaultButtonVariants(disabled)}
						type="button"
						animate={{ rotate: isNoteMaximized ? 180 : 0 }}
					>
						<SidebarRightCollapse
							title={isNoteMaximized ? "Minimize" : "Maximize"}
							height="1.4rem"
							width="1.4rem"
						/>
					</MotionIconButton>

					<Dropdown
						controlledValueIndex={blockTypesDropdownItems.findIndex(
							(v) => v.value === currentBlockType,
						)}
						dropdownItemsClassName="max-h-[calc(100vh-10rem)]"
						onChange={({ value }) =>
							changeSelectedBlocksType(editor, value, folder, note, attachments)
						}
						items={blockTypesDropdownItems}
						buttonClassName="w-[10rem]"
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
					setFloatingData={setFloatingData}
					noteContainerRef={noteContainerRef}
					shouldShowUndoRedo
				/>
			</nav>
		</>
	);
}
