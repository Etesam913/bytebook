import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef, useState } from "react";
import { useShowWhenInViewport } from "../../hooks/observers";
import { Loader } from "../../icons/loader";
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
	const [isLoading, setIsLoading] = useState(true);
	const loaderRef = useRef<HTMLDivElement>(null); // Reference for loader

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
		setSelected,
		clearSelection,
		imgRef,
	);

	useShowWhenInViewport(loaderRef, setIsLoading);

	return (
		<div
			className="mr-2 inline-block"
			onClick={(e) => {
				clearSelection();
				setSelected(true);
				e.stopPropagation();
			}}
		>
			{isLoading ? (
				<div
					ref={loaderRef}
					className="my-3 w-full h-[36rem] bg-gray-300 animate-pulse"
				/>
			) : (
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
						src={src}
						ref={imgRef}
						alt={alt}
						draggable={false}
						className={cn("w-full h-auto my-auto scroll-m-10")}
						data-lexical-decorator="true"
					/>
				</ResizeContainer>
			)}
		</div>
	);
}
