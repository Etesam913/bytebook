import { NoteRenderer } from '../../note-renderer';
import { useFilePathFromRoute } from '../../../hooks/routes';
import { NotFound } from '../../../routes/not-found';

export function EditorWrapper() {
  const filePath = useFilePathFromRoute();
  if (!filePath) {
    // Replace with 404 page
    return <NotFound />;
  }

  return (
    <div className="flex w-full">
      <NoteRenderer filePath={filePath} />
    </div>
  );
}
