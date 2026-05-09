import { EmptyLinePlaceholderRow } from './appearance/empty-line-placeholder-row';
import { FontFamilyRow } from './appearance/font-family-row';
import { FontSizeRow } from './appearance/font-size-row';
import { NoteWidthRow } from './appearance/note-width-row';

export function EditorPage() {
  return (
    <>
      <FontSizeRow />
      <FontFamilyRow setting="editor" />
      <NoteWidthRow />
      <EmptyLinePlaceholderRow />
    </>
  );
}
