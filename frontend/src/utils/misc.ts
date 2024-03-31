export function updateMostRecentNotesOnNoteDelete(
  folder: string,
  noteName: string,
  mostRecentNotes: string[],
  setMostRecentNotes: (a: string[]) => void,
) {
  const notePath = `${folder}/${noteName}`;
  const newMostRecentNotes = mostRecentNotes.filter((v) => v !== notePath);
  setMostRecentNotes(newMostRecentNotes);
}

export function updateMostRecentNotesOnFolderDelete(
  folder: string,
  mostRecentNotes: string[],
  setMostRecentNotes: (a: string[]) => void,
) {
  const newMostRecentNotes = mostRecentNotes.filter(
    (v) => !v.startsWith(folder),
  );
  setMostRecentNotes(newMostRecentNotes);
}
