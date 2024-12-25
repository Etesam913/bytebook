import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef, useState } from "react";
import { useShowWhenInViewport } from "../../hooks/observers";
import type { ResizeWidth } from "../../types";
import { useResizeCommands, useResizeState } from "../../utils/hooks";
import { cn } from "../../utils/string-formatting";
import { ResizeContainer } from "../resize-container";

export function Image({
	src,
	alt,
	widthWrittenToNode,
	writeWidthToNode,
	nodeKey,
}: {
	src: string;
	alt: string;
	widthWrittenToNode: ResizeWidth;
	writeWidthToNode: (width: ResizeWidth) => void;
	nodeKey: string;
}) {
	const imgRef = useRef<HTMLImageElement>(null);
	const [editor] = useLexicalComposerContext();
	const loaderRef = useRef<HTMLDivElement>(null); // Reference for loader

	const [isInViewport, setIsInViewport] = useState(true);
	const [isLoading, setIsLoading] = useState(true);

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
		nodeKey,
		clearSelection,
		imgRef,
	);

	useShowWhenInViewport(loaderRef, setIsInViewport, isExpanded);

	return (
		<div
			className={cn(
				"mr-2 inline-block",
				(isLoading || isInViewport) && "block",
			)}
		>
			{isInViewport ? (
				<div
					ref={loaderRef}
					className={cn(
						"my-3 w-full h-[36rem] bg-gray-200 dark:bg-zinc-600 animate-pulse pointer-events-none",
					)}
				/>
			) : (
				<>
					{isLoading && (
						<div
							className={cn(
								"my-3 w-full h-[36rem] bg-gray-200 dark:bg-zinc-600 animate-pulse pointer-events-none",
							)}
						/>
					)}
					<ResizeContainer
						resizeState={{
							isResizing,
							setIsResizing,
							isSelected,
							setSelected,
							isExpanded,
							setIsExpanded,
						}}
						element={imgRef.current}
						nodeKey={nodeKey}
						defaultWidth={widthWrittenToNode}
						writeWidthToNode={writeWidthToNode}
						elementType="default"
					>
						<img
							style={{ display: isLoading ? "none" : "block" }}
							src={src}
							onLoad={() => setIsLoading(false)}
							ref={imgRef}
							alt={alt}
							draggable={false}
							className={cn(
								"w-full h-auto my-auto scroll-m-10",
								isExpanded && "h-full w-auto mx-auto",
							)}
							data-nodeKey={nodeKey}
							data-interactable="true"
						/>
					</ResizeContainer>
				</>
			)}
		</div>
	);
}
