import { EmptyLinePlaceholderRow } from './appearance/empty-line-placeholder-row';
import { FontFamilyRow } from './appearance/font-family-row';
import { FontSizeRow } from './appearance/font-size-row';
import { LineHeightRow } from './appearance/line-height-row';
import { NoteWidthRow } from './appearance/note-width-row';
import { TableOfContentsRow } from './appearance/table-of-contents-row';

export function EditorPage() {
  return (
    <>
      <FontSizeRow />
      <LineHeightRow />
      <FontFamilyRow setting="editor" />
      <NoteWidthRow />
      <EmptyLinePlaceholderRow />
      <TableOfContentsRow />
    </>
  );
}
