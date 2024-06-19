import { useAtomValue } from "jotai";
import { useRef } from "react";
import { draggedElementAtom } from "../../atoms";
import { cn } from "../../utils/string-formatting";

export default function Pdf({
	src,
	alt,
}: {
	src: string;
	alt: string;
}) {
	const pdfRef = useRef<HTMLIFrameElement>(null);
	const draggedElement = useAtomValue(draggedElementAtom);

	return (
		<div
			className="mr-2 inline-block relative pt-[100%] h-0 w-full"
			onClick={() => {
				console.log("clicked");
			}}
		>
			<iframe
				ref={pdfRef}
				title={alt}
				draggable={false}
				allow="fullscreen"
				className={cn(
					"w-full h-full absolute top-0 left-0",
					draggedElement && "pointer-events-none",
				)}
				src={src}
			/>
		</div>
	);
}
