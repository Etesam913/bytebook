import { FileBan } from '../../icons/file-ban';
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from '../../types';
import { FilePath } from '../../utils/path';
import { NotesEditor } from '../editor';
import { ImageRenderer } from './image-renderer';
import { VideoRenderer } from './video-renderer';

export function NoteRenderer({ filePath }: { filePath: FilePath }) {
  const { extension } = filePath;

  const isPdf = extension === 'pdf';
  const isMarkdown = extension === 'md';
  const isImage = extension && IMAGE_FILE_EXTENSIONS.includes(extension);
  const isVideo = extension && VIDEO_FILE_EXTENSIONS.includes(extension);
  const isUnknownFile =
    !isPdf && !isMarkdown && !isImage && !isVideo && extension;

  if (isPdf) {
    return <iframe src={filePath.fileUrl} className="w-full h-full flex-1" />;
  }

  if (isImage) {
    return (
      <div className="w-full h-full flex-1">
        <ImageRenderer filePath={filePath} />
      </div>
    );
  }

  if (isVideo) {
    return <VideoRenderer filePath={filePath} />;
  }

  if (isMarkdown) {
    return (
      <div className="w-full h-full flex-1">
        <NotesEditor filePath={filePath} />;
      </div>
    );
  }

  if (isUnknownFile) {
    return (
      <div className="w-full h-full flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <FileBan width={48} height={48} />
          <h1 className="text-2xl font-bold">
            This file type is not supported.
          </h1>
        </div>
      </div>
    );
  }
}
