import { useAtom } from 'jotai';
import { fileSidebarOpenStateAtom } from '../../../atoms';
import { VirtualizedFileTree } from '../../virtualized/virtualized-file-tree';
import { Note } from '../../../icons/page';
import { AccordionButton } from '../../accordion/accordion-button';

export function MyFilesAccordion() {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
  const isOpen = openState.folders;

  return (
    <section>
      <AccordionButton
        isOpen={isOpen}
        onClick={() =>
          setOpenState((prev) => ({
            ...prev,
            folders: !prev.folders,
          }))
        }
        icon={<Note width={18} height={18} strokeWidth={1.75} />}
        title="Files"
      />

      <VirtualizedFileTree isOpen={isOpen} />
    </section>
  );
}
