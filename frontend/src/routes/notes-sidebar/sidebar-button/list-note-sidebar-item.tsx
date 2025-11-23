import { RenderNoteIcon } from '../../../icons/render-note-icon';
import { LocalFilePath } from '../../../utils/string-formatting';

export function ListNoteSidebarItem({
  sidebarNotePath,
  activeNotePath,
}: {
  sidebarNotePath: LocalFilePath;
  activeNotePath: LocalFilePath | undefined;
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

        {/* 
        // TODO: Add a setting to enable this 
        <span className="shrink-0 px-1 py-0.5 outline-2 rounded-md outline-zinc-300 dark:outline-zinc-650 bg-zinc-700 text-xs flex items-center h-fit my-auto">
          {sidebarNotePath.noteExtension}
        </span> */}
      </p>
    </>
  );
}
