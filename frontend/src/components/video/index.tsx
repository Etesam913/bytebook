import { VideoHTMLAttributes } from "react";

export function Video(props: VideoHTMLAttributes<HTMLVideoElement>) {
	return (
		<video
			{...props}
			src={`${props.src}#t=0.1`}
			onClick={(e) => e.stopPropagation()}
			controls
			className="w-full"
			preload="metadata"
		/>
	);
}
