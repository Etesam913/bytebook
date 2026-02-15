import { RenderNoteIcon } from '../../../icons/render-note-icon';
import { type FilePath } from '../../../utils/path';

export function ListNoteSidebarItem({
  sidebarNotePath,
  activeNotePath,
}: {
  sidebarNotePath: FilePath;
  activeNotePath: FilePath | undefined;
}) {
  return (
    <>
      <RenderNoteIcon
        filePath={sidebarNotePath}
        activeNotePath={activeNotePath}
      />
      <p className="pointer-events-none flex min-w-0 justify-between w-full">
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {sidebarNotePath.noteWithoutExtension}
        </span>
      </p>
    </>
  );
}
