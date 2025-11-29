"use client";

import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

interface LiteYouTubeProps {
  videoId: string;
  title?: string;
}

export function LiteYouTube({
  videoId,
  title = "YouTube Video",
}: LiteYouTubeProps) {
  return (
    <div className="my-6 [&_>_div]:rounded-xl [&_>_div]:overflow-hidden">
      <LiteYouTubeEmbed id={videoId} title={title} poster="maxresdefault" />
    </div>
  );
}
