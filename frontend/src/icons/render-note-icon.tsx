import { FileBan } from './file-ban';
import { FilePen } from './file-pen';
import { ImageIcon } from '../icons/image';
import { Note } from './page';
import { PDFIcon } from './pdf-icon';
import { VideoIcon } from './video';
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from '../types';
import { FilePath } from '../utils/path';

export function RenderNoteIcon({
  filePath,
  activeNotePath,
  size,
}: {
  filePath: FilePath;
  activeNotePath?: FilePath;
  size?: 'sm';
}) {
  const iconSize = size === 'sm' ? 18 : 20;

  if (filePath.extension === 'md') {
    if (activeNotePath && filePath.equals(activeNotePath)) {
      return (
        <FilePen
          className="min-w-[20px] pointer-events-none"
          height={iconSize}
          width={iconSize}
        />
      );
    }
    return (
      <Note
        className="min-w-[20px] pointer-events-none"
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (filePath.extension === 'pdf') {
    return (
      <PDFIcon
        className="min-w-[20px] pointer-events-none"
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (IMAGE_FILE_EXTENSIONS.includes(filePath.extension)) {
    return (
      <ImageIcon
        className="min-w-[20px] pointer-events-none"
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (VIDEO_FILE_EXTENSIONS.includes(filePath.extension)) {
    return (
      <VideoIcon
        className="min-w-[20px] pointer-events-none"
        height={iconSize}
        width={iconSize}
      />
    );
  }

  return (
    <FileBan
      className="min-w-[20px] pointer-events-none"
      height={iconSize}
      width={iconSize}
    />
  );
}
