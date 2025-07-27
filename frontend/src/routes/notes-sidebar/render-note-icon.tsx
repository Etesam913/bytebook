import { FileBan } from '../../icons/file-ban';
import { FilePen } from '../../icons/file-pen';
import { ImageIcon } from '../../icons/image';
import { Note } from '../../icons/page';
import { PDFIcon } from '../../icons/pdf-icon';
import { VideoIcon } from '../../icons/video';
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from '../../types';

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
