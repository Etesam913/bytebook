import { RenderNoteIcon } from '../../../icons/render-note-icon';

export function ListNoteSidebarItem({
  sidebarNoteName,
  sidebarNoteExtension,
  activeNoteNameWithExtension,
  sidebarNoteNameWithoutExtension,
}: {
  sidebarNoteName: string;
  sidebarNoteExtension: string;
  activeNoteNameWithExtension: string;
  sidebarNoteNameWithoutExtension: string;
}) {
  return (
    <>
      <RenderNoteIcon
        sidebarNoteName={sidebarNoteName}
        fileExtension={sidebarNoteExtension}
        noteNameWithExtension={activeNoteNameWithExtension}
      />
      <p className="pointer-events-none flex min-w-0">
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {sidebarNoteNameWithoutExtension}
        </span>
        <span className="shrink-0">.{sidebarNoteExtension}</span>
      </p>
    </>
  );
}
