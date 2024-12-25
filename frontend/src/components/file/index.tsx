import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader } from "../../icons/loader";
import type { ResizeWidth } from "../../types";
import type { FileType } from "../editor/nodes/file";
import { getFileElementTypeFromExtensionAndHead } from "../editor/utils/file-node";
import { Image } from "./image";
import { Pdf } from "./pdf";
import { UnknownAttachment } from "./unknown-attachment";
import { Video } from "./video";
import { YouTube } from "./youtube";

export function File({
	src,
	widthWrittenToNode,
	writeWidthToNode,
	title,
	nodeKey,
	setElementType,
}: {
	src: string;
	widthWrittenToNode: ResizeWidth;
	writeWidthToNode: (width: ResizeWidth) => void;
	title: string;
	nodeKey: string;
	setElementType: (elementType: FileType) => void;
}) {
	// TODO: I think there is a bottleneck with using useQuery here for some reason. Try without it
	const { data: fileType, isLoading } = useQuery({
		queryKey: ["file", src],
		queryFn: async () => await getFileElementTypeFromExtensionAndHead(src),
	});

	useEffect(() => {
		if (!fileType) return;
		setElementType(fileType);
	}, [fileType]);

	if (isLoading) return <Loader width={28} height={28} />;

	if (fileType === "video") {
		return (
			<Video
				src={src}
				widthWrittenToNode={widthWrittenToNode}
				writeWidthToNode={writeWidthToNode}
				title={title}
				nodeKey={nodeKey}
			/>
		);
	}
	if (fileType === "image") {
		return (
			<Image
				src={src}
				alt={title}
				widthWrittenToNode={widthWrittenToNode}
				writeWidthToNode={writeWidthToNode}
				nodeKey={nodeKey}
			/>
		);
	}
	if (fileType === "youtube") {
		return (
			<YouTube
				src={src}
				alt={title}
				nodeKey={nodeKey}
				widthWrittenToNode={widthWrittenToNode}
				writeWidthToNode={writeWidthToNode}
			/>
		);
	}

	if (fileType === "pdf") {
		return <Pdf src={src} alt={title} nodeKey={nodeKey} />;
	}

	// Replace with unknown attachment
	return <UnknownAttachment nodeKey={nodeKey} src={src} />;
}
