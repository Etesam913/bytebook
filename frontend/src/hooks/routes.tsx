import { useRoute } from 'wouter';
import {
  FilePath,
  createFilePath,
  safeDecodeURIComponent,
} from '../utils/path';
import { NotesRouteParams } from '../utils/routes';

export function useFilePathFromRoute(): FilePath | null {
  const [isNoteRoute, noteParams] = useRoute<NotesRouteParams>('/notes/*');
  const filePath =
    isNoteRoute && noteParams['*']
      ? createFilePath(safeDecodeURIComponent(noteParams['*']))
      : null;
  return filePath;
}
