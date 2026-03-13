import { useAnimationControls } from 'motion/react';
import { NoteRenderer } from '../../note-renderer';
import { FolderRenderer } from '../../folder-renderer';
import {
  useFilePathFromRoute,
  useFolderPathFromRoute,
} from '../../../hooks/routes';
import { NotFound } from '../../../routes/not-found';

export function EditorWrapper() {
  const filePath = useFilePathFromRoute();
  const folderPath = useFolderPathFromRoute();
  const animationControls = useAnimationControls();

  if (filePath) {
    return (
      <div className="flex h-full min-w-0 flex-1">
        <NoteRenderer filePath={filePath} />
      </div>
    );
  }

  if (folderPath) {
    return (
      <FolderRenderer
        folderPath={folderPath}
        animationControls={animationControls}
      />
    );
  }

  return <NotFound />;
}
