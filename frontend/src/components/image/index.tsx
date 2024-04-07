import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useResizeCommands, useResizeState } from "../../utils/hooks";
import type { ResizeWidth } from "../editor/nodes/image";
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
	const [, params] = useRoute("/:folder/:note?");

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

	useEffect(() => {
		if (isSelected) {
			imgRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
		}
	}, [isSelected]);

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
				defaultWidth={widthWrittenToNode}
				writeWidthToNode={writeWidthToNode}
			>
				<img
					onClick={() => {
						clearSelection();
						setSelected(true);
					}}
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
