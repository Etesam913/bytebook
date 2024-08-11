import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import type { ResizeWidth } from "../../types";
import { cn } from "../../utils/string-formatting";
import { extractYouTubeVideoID } from "../editor/utils/file-node";

export function YouTube({
	src,
	alt,
	nodeKey,
}: {
	src: string;
	alt: string;
	nodeKey: string;
	widthWrittenToNode: ResizeWidth;
	writeWidthToNode: (width: ResizeWidth) => void;
}) {
	const [isSelected] = useLexicalNodeSelection(nodeKey);

	const youtubeId = extractYouTubeVideoID(src);

	return (
		<div
			id="youtube-container"
			className={cn(
				"w-full h-full border-[4px] border-transparent transition-colors",
				isSelected && "border-blue-400 dark:border-blue-500",
			)}
		>
			{youtubeId ? (
				<LiteYouTubeEmbed id={youtubeId} title={alt} />
			) : (
				<div>Invalid YouTube URL</div>
			)}
		</div>
	);
}
