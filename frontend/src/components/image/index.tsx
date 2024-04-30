import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import type { ResizeWidth } from "../../types";
import { useResizeCommands, useResizeState } from "../../utils/hooks";
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

	useEffect(() => {
		if (isSelected) {
			imgRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
		}
	}, [isSelected]);

	return (
		<div className="w-fit inline-block mx-2">
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
				elementType="image"
			>
				<img
					src={src}
					ref={imgRef}
					alt={alt}
					draggable={false}
					className="w-full h-auto my-auto scroll-m-10"
					data-lexical-decorator="true"
				/>
			</ResizeContainer>
		</div>
	);
}
