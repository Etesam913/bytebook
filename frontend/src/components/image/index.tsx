import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef } from "react";
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
		imgRef,
	);

	return (
		<div className="mr-2 inline-block">
			<ResizeContainer
				resizeState={{
					isResizing,
					setIsResizing,
					isSelected,
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
					className={cn(
						"w-full h-auto my-auto scroll-m-10",
						isResizing && "opacity-50",
					)}
					data-lexical-decorator="true"
				/>
			</ResizeContainer>
		</div>
	);
}
