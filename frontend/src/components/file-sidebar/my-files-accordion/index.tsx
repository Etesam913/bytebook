import { useAtom } from 'jotai';
import { useFolders } from '../../../hooks/folders';
import { fileSidebarOpenStateAtom } from '../../../atoms';
import { VirtualizedFileTree } from '../../virtualized/virtualized-file-tree';
import { Note } from '../../../icons/page';
import { AccordionButton } from '../../accordion/accordion-button';

export function MyFilesAccordion() {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
  const isOpen = openState.folders;
  const { data } = useFolders();
  const alphabetizedFolders = data?.alphabetizedFolders ?? null;

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
        title={
          <>
            Files{' '}
            {alphabetizedFolders && alphabetizedFolders.length > 0 && (
              <span className="tracking-wider">
                ({alphabetizedFolders.length})
              </span>
            )}
          </>
        }
      />

      <VirtualizedFileTree isOpen={isOpen} />
    </section>
  );
}
