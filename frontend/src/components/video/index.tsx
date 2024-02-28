import { VideoHTMLAttributes } from "react";

export function Video(props: VideoHTMLAttributes<HTMLVideoElement>) {
	return <video {...props} controls className="w-full" />;
}
