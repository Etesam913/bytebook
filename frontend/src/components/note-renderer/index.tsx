import { motion, useAnimationControls } from 'motion/react';
import { FileBan } from '../../icons/file-ban';
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from '../../types';
import { FilePath } from '../../utils/path';
import { NotesEditor } from '../editor';
import { ImageRenderer } from './image-renderer';
import { VideoRenderer } from './video-renderer';
import { NonMarkdownToolbar } from '../../routes/notes-sidebar/render-note/non-markdown-toolbar';

export function NoteRenderer({ filePath }: { filePath: FilePath }) {
  const { extension } = filePath;
  const animationControls = useAnimationControls();

  const isPdf = extension === 'pdf';
  const isMarkdown = extension === 'md';
  const isImage = extension && IMAGE_FILE_EXTENSIONS.includes(extension);
  const isVideo = extension && VIDEO_FILE_EXTENSIONS.includes(extension);
  const isUnknownFile =
    !isPdf && !isMarkdown && !isImage && !isVideo && extension;

  if (isPdf) {
    return (
      <motion.div
        className="w-full h-full min-w-0 flex-1"
        animate={animationControls}
      >
        <iframe
          src={filePath.fileUrl}
          className="w-full h-full min-w-0 flex-1"
        />
      </motion.div>
    );
  }

  if (isImage) {
    return (
      <motion.div
        className="w-full h-full min-w-0 flex flex-col flex-1"
        animate={animationControls}
      >
        <NonMarkdownToolbar
          animationControls={animationControls}
          filePath={filePath}
        />
        <ImageRenderer filePath={filePath} />
      </motion.div>
    );
  }

  if (isVideo) {
    return (
      <motion.div
        className="w-full h-full min-h-0 min-w-0 flex flex-col flex-1"
        animate={animationControls}
      >
        <NonMarkdownToolbar
          animationControls={animationControls}
          filePath={filePath}
        />
        <div className="w-full min-h-0 min-w-0 flex-1 flex flex-col items-center justify-center bg-black">
          <VideoRenderer filePath={filePath} />
        </div>
      </motion.div>
    );
  }

  if (isMarkdown) {
    return (
      <motion.div
        className="w-full h-full min-w-0 flex-1"
        animate={animationControls}
      >
        <NotesEditor
          filePath={filePath}
          animationControls={animationControls}
        />
      </motion.div>
    );
  }

  if (isUnknownFile) {
    return (
      <motion.div
        className="w-full h-full min-w-0 flex-1 flex flex-col"
        animate={animationControls}
      >
        <NonMarkdownToolbar
          animationControls={animationControls}
          filePath={filePath}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <FileBan width="3rem" height="3rem" />
          <h1 className="text-2xl font-bold">
            This file type is not supported.
          </h1>
        </div>
      </motion.div>
    );
  }
}
