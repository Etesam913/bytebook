import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import { useResizeCommands, useResizeState } from "../../utils/hooks";
import { ResizeContainer } from "../resize-container";

export function Image({
	src,
	width,
	height,
	nodeKey,
}: {
	src: string;
	width: number | "inherit";
	height: number | "inherit";
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
		isResizing,
		isSelected,
		nodeKey,
		setSelected,
		clearSelection,
		imgRef,
	);

	// useEffect(() => {
	// 	if (isSelected) {
	// 		imgRef.current?.scrollIntoView({ block: "start" });
	// 	}
	// }, [isSelected]);

	return (
		<div className="w-full">
			<ResizeContainer
				isSelected={isSelected}
				isResizing={isResizing}
				setIsResizing={setIsResizing}
				element={imgRef.current}
				nodeKey={nodeKey}
				editor={editor}
				isExpanded={isExpanded}
				setIsExpanded={setIsExpanded}
			>
				<img
					src={src}
					ref={imgRef}
					alt={"bob"}
					draggable={false}
					className="w-full h-auto my-auto scroll-m-10"
					data-lexical-decorator="true"
				/>
			</ResizeContainer>
		</div>
	);
}
