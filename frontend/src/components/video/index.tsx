import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef, useState } from "react";
import { useResizeCommands, useResizeState } from "../../utils/hooks";
import type { ResizeWidth } from "../editor/nodes/image";
import { ResizeContainer } from "../resize-container";
import { Dialog } from "../dialog";
import { MotionButton } from "../buttons";
import { getDefaultButtonVariants } from "../../variants";

export function Video({
	src,
	widthWrittenToNode,
	writeWidthToNode,
	title,
	nodeKey,
	subtitleUrlWrittenToNode,
	writeSubtitleUrlToNode,
}: {
	src: string;
	widthWrittenToNode: ResizeWidth;
	writeWidthToNode: (width: ResizeWidth) => void;
	title: string;
	nodeKey: string;
	subtitleUrlWrittenToNode?: string;
	writeSubtitleUrlToNode: (url: string) => void;
}) {
	const [editor] = useLexicalComposerContext();
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isSubtitlesDialogOpen, setIsSubtitlesDialogOpen] = useState(false);
	const [subtitleUrl, setSubtitleUrl] = useState(
		subtitleUrlWrittenToNode ?? "",
	);

	const {
		isResizing,
		setIsResizing,
		isSelected,
		setSelected,
		clearSelection,
		isExpanded,
		setIsExpanded,
	} = useResizeState(nodeKey);

	useResizeCommands(
		editor,
		isExpanded,
		setIsExpanded,
		isSelected,
		isResizing,
		nodeKey,
		setSelected,
		clearSelection,
		videoRef,
	);

	useEffect(() => {
		if (isSelected) {
			videoRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
		}
	}, [isSelected]);

	return (
		<>
			<Dialog
				title="Set Subtitles Url"
				isOpen={isSubtitlesDialogOpen}
				setIsOpen={setIsSubtitlesDialogOpen}
				handleSubmit={() => {
					setIsSubtitlesDialogOpen(false);
					writeSubtitleUrlToNode(subtitleUrl);
				}}
			>
				<div className="flex flex-col gap-2">
					<input
						type="text"
						value={subtitleUrl}
						className="py-1 px-2 rounded-sm border-[1px] border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors w-full"
						onChange={(e) => setSubtitleUrl(e.target.value)}
						placeholder="path_to_my_file.vtt"
						onKeyDown={(e) => e.stopPropagation()}
					/>
					<MotionButton
						type="submit"
						{...getDefaultButtonVariants(false, 1.025, 0.95, 1.025)}
						className="w-full text-center flex items-center gap-2 justify-center flex-wrap "
					>
						Set Note Url
					</MotionButton>
				</div>
			</Dialog>
			<div className="w-full">
				<ResizeContainer
					resizeState={{
						isResizing,
						setIsResizing,
						isSelected,
						isExpanded,
						setIsExpanded,
						setIsSubtitlesDialogOpen,
					}}
					element={videoRef.current}
					nodeKey={nodeKey}
					defaultWidth={widthWrittenToNode}
					writeWidthToNode={writeWidthToNode}
					elementType="video"
				>
					{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
					<video
						ref={videoRef}
						className="w-full h-auto bg-black"
						title={title}
						src={src}
						controls
						onClick={() => {
							clearSelection();
							setSelected(true);
						}}
					>
						{subtitleUrl.length > 0 && (
							<track
								label="English"
								kind="subtitles"
								srcLang="en"
								src={subtitleUrl}
								default
							/>
						)}
					</video>
				</ResizeContainer>
			</div>
		</>
	);
}
