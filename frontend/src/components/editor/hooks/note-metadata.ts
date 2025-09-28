import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { mostRecentNotesAtom } from '../../../atoms';
import { ValidateMostRecentNotes } from '../../../../bindings/github.com/etesam913/bytebook/internal/services/noteservice';
import { FilePath } from '../../../utils/string-formatting';

export function useMostRecentNotes(filePath: FilePath) {
  const [mostRecentNotes, setMostRecentNotes] = useAtom(mostRecentNotesAtom);

  useEffect(() => {
    // Remove the current file if it already exists in recent notes
    const tempMostRecentNotes = mostRecentNotes.filter(
      (recentPath) => !recentPath.equals(filePath)
    );

    // Keep only the 4 most recent (excluding current)
    if (tempMostRecentNotes.length > 4) {
      tempMostRecentNotes.pop();
    }

    // Add current file to the beginning
    tempMostRecentNotes.unshift(filePath);

    // Convert to backend format for validation
    const mostRecentNotesForBackend = tempMostRecentNotes.map((path) =>
      path.toString()
    );

    ValidateMostRecentNotes(mostRecentNotesForBackend).then((validPaths) => {
      if (validPaths) {
        // Convert validated paths back to FilePath objects
        const validFilePaths = validPaths
          .filter((path) => {
            return path.split('/').length === 2;
          })
          .map((path) => {
            const segments = path.split('/');
            return new FilePath({ folder: segments[0], note: segments[1] });
          });
        setMostRecentNotes(validFilePaths);
      }
    });
  }, [
    filePath.folder,
    filePath.noteWithoutExtension,
    filePath.noteExtension,
    setMostRecentNotes,
  ]);
}
