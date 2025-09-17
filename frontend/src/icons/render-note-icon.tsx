import { FileBan } from './file-ban';
import { FilePen } from './file-pen';
import { ImageIcon } from '../icons/image';
import { Note } from './page';
import { PDFIcon } from './pdf-icon';
import { VideoIcon } from './video';
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from '../types';

export function RenderNoteIcon({
  noteNameWithExtension,
  sidebarNoteName,
  fileExtension,
  size,
}: {
  noteNameWithExtension?: string;
  sidebarNoteName?: string;
  fileExtension: string;
  size?: 'sm';
}) {
  const iconSize = size === 'sm' ? 18 : 20;

  if (fileExtension === 'md') {
    if (
      noteNameWithExtension &&
      sidebarNoteName &&
      noteNameWithExtension === sidebarNoteName
    ) {
      return (
        <FilePen
          title="Editing Note"
          className="min-w-[20px] pointer-events-none"
          height={iconSize}
          width={iconSize}
        />
      );
    }
    return (
      <Note
        title="Note"
        className="min-w-[20px] pointer-events-none"
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (fileExtension === 'pdf') {
    return (
      <PDFIcon
        title="PDF"
        className="min-w-[20px] pointer-events-none"
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (IMAGE_FILE_EXTENSIONS.includes(fileExtension)) {
    return (
      <ImageIcon
        title="Image"
        className="min-w-[20px] pointer-events-none"
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (VIDEO_FILE_EXTENSIONS.includes(fileExtension)) {
    return (
      <VideoIcon
        title="Video"
        className="min-w-[20px] pointer-events-none"
        height={iconSize}
        width={iconSize}
      />
    );
  }

  return (
    <FileBan
      title="Note Not Supported"
      className="min-w-[20px] pointer-events-none"
      height={iconSize}
      width={iconSize}
    />
  );
}
