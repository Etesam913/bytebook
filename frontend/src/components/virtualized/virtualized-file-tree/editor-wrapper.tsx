import { useRoute } from 'wouter';
import { createFilePath } from '../../../utils/path';
import { NoteRenderer } from '../../note-renderer';

export function EditorWrapper() {
  const [isNoteRoute, noteParams] = useRoute('/notes/*');
  const filePath = noteParams?.['*']
    ? createFilePath(decodeURIComponent(noteParams?.['*']))
    : null;

  if (!isNoteRoute || !filePath) {
    // Replace with 404 page
    return null;
  }

  return (
    <div className="flex w-full">
      <NoteRenderer filePath={filePath} />
    </div>
  );
}
