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
  const iconSize = size === 'sm' ? '1rem' : '1.25rem';

  if (filePath.extension === 'md') {
    if (activeNotePath && filePath.equals(activeNotePath)) {
      return (
        <FilePen
          className={'pointer-events-none min-w-4 min-h-4'}
          height={iconSize}
          width={iconSize}
        />
      );
    }
    return (
      <Note
        className={'pointer-events-none min-w-4 min-h-4'}
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (filePath.extension === 'pdf') {
    return (
      <PDFIcon
        className={'pointer-events-none min-w-4 min-h-4'}
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (IMAGE_FILE_EXTENSIONS.includes(filePath.extension)) {
    return (
      <ImageIcon
        className={'pointer-events-none min-w-4 min-h-4'}
        height={iconSize}
        width={iconSize}
      />
    );
  }

  if (VIDEO_FILE_EXTENSIONS.includes(filePath.extension)) {
    return (
      <VideoIcon
        className={'pointer-events-none min-w-4 min-h-4'}
        height={iconSize}
        width={iconSize}
      />
    );
  }

  return (
    <FileBan
      className={'pointer-events-none min-w-4 min-h-4'}
      height={iconSize}
      width={iconSize}
    />
  );
}
