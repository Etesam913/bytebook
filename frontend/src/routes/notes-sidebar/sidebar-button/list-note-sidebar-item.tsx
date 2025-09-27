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
      <p className="pointer-events-none flex min-w-0 justify-between w-full">
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {sidebarNoteNameWithoutExtension}
        </span>

        {/* 
        // TODO: Add a setting to enable this 
        <span className="shrink-0 px-1 py-0.5 outline-2 rounded-md outline-zinc-300 dark:outline-zinc-650 bg-zinc-700 text-xs flex items-center h-fit my-auto">
          {sidebarNoteExtension}
        </span> */}
      </p>
    </>
  );
}
