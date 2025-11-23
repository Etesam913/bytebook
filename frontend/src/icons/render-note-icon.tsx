import { FileBan } from './file-ban';
import { FilePen } from './file-pen';
import { ImageIcon } from '../icons/image';
import { Note } from './page';
import { PDFIcon } from './pdf-icon';
import { VideoIcon } from './video';
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from '../types';
import { LocalFilePath } from '../utils/string-formatting';

export function RenderNoteIcon({
  filePath,
  activeNotePath,
  size,
}: {
  filePath: LocalFilePath;
  activeNotePath?: LocalFilePath;
  size?: 'sm';
}) {
  const iconSize = size === 'sm' ? 18 : 20;

  if (filePath.noteExtension === 'md') {
    if (activeNotePath && filePath.equals(activeNotePath)) {
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

  if (filePath.noteExtension === 'pdf') {
    return (
      <PDFIcon
        title="PDF"
        className="min-w-[20px] pointer-events-none"
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (IMAGE_FILE_EXTENSIONS.includes(filePath.noteExtension)) {
    return (
      <ImageIcon
        title="Image"
        className="min-w-[20px] pointer-events-none"
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (VIDEO_FILE_EXTENSIONS.includes(filePath.noteExtension)) {
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
