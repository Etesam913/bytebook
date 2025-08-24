import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { mostRecentNotesAtom } from '../../../atoms';
import { ValidateMostRecentNotes } from '../../../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import {
  convertFilePathToQueryNotation,
  FilePath,
} from '../../../utils/string-formatting';

export function useMostRecentNotes(filePath: FilePath) {
  const [mostRecentNotes, setMostRecentNotes] = useAtom(mostRecentNotesAtom);

  useEffect(() => {
    const currentPath = convertFilePathToQueryNotation(
      `${filePath.folder}/${filePath.noteWithoutExtension}.${filePath.noteExtension}`
    );
    const tempMostRecentNotes = mostRecentNotes.filter(
      (path) => path !== currentPath
    );
    if (tempMostRecentNotes.length > 4) {
      tempMostRecentNotes.pop();
    }
    tempMostRecentNotes.unshift(currentPath);
    const mostRecentNotesForBackend = tempMostRecentNotes.map((path) => {
      const lastIndex = path.lastIndexOf('?ext=');
      const folderAndNote = path.substring(0, lastIndex);
      const ext = path.substring(lastIndex + 5);

      return `${folderAndNote}.${ext}`;
    });

    ValidateMostRecentNotes(mostRecentNotesForBackend).then((res) => {
      setMostRecentNotes(res ?? []);
    });
  }, [
    filePath.folder,
    filePath.noteWithoutExtension,
    filePath.noteExtension,
    setMostRecentNotes,
  ]);
}
