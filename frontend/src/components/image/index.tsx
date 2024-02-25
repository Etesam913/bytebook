import { Resizable, Size } from "re-resizable";
import { ImgHTMLAttributes, useRef, useState } from "react";
import { cn } from "../../utils/string-formatting";

export function Image(props: ImgHTMLAttributes<HTMLImageElement>) {
	const imgRef = useRef<HTMLImageElement>(null);
	const [size, setSize] = useState<Size>({ width: "100%", height: "auto" });
	const [isResizing, setIsResizing] = useState(false);

	return (
		<Resizable
			size={size}
			maxWidth="100%"
			minWidth={100}
			onResizeStart={() => setIsResizing(true)}
			onResizeStop={() => setIsResizing(false)}
			enable={{ bottomRight: true }}
			className={cn("", isResizing && "opacity-50")}
			onResize={(_, _v, divContainer) => {
				console.log("resize");
				const containerWidth = divContainer.clientWidth;
				const imageHeight = imgRef.current?.height;
				if (imageHeight) {
					setSize({ width: containerWidth, height: imageHeight });
				}
			}}
		>
			<img
				onClick={(e) => {
					e.stopPropagation();
				}}
				{...props}
				ref={imgRef}
				onLoad={(e) => {
					const target = e.target as HTMLImageElement;
					setSize({ width: target.clientWidth, height: target.clientHeight });
				}}
				alt="bob"
				draggable={false}
				className="w-full h-auto"
			/>
		</Resizable>
	);
}
