import { Link } from 'wouter';
import { Note } from '../../icons/page';
import { createGhostElementFromHtmlElement } from '../../utils/draggable';

export function AccordionItem({
  to,
  itemName,
  onContextMenu,
}: {
  to: string;
  itemName: string;
  onContextMenu?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
}) {
  return (
    <li className="overflow-x-hidden">
      <div className="flex select-none items-center gap-2 overflow-hidden pr-1 text-zinc-600 dark:text-zinc-300">
        <Link
          onContextMenu={onContextMenu}
          title={itemName}
          draggable
          target="_blank"
          onDragStart={(e) => {
            const dragElement = e.target as HTMLElement;
            const ghostElement = createGhostElementFromHtmlElement(
              dragElement,
              ['dragging']
            );
            document.body.appendChild(ghostElement);
            e.dataTransfer.setDragImage(ghostElement, -25, -25);
            // Clean up the ghost element after the drag ends
            function handleDragEnd() {
              // Update the selected range so that only 1 item is highlighted
              ghostElement.remove();
              dragElement.removeEventListener('dragEnd', handleDragEnd);
            }

            dragElement.addEventListener('dragend', handleDragEnd);
          }}
          className="flex flex-1 items-center gap-2 overflow-x-hidden rounded-md px-2 py-1"
          to={to}
        >
          <Note className="min-w-4" title="" width={16} height={16} />
          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">
            {itemName}
          </p>
        </Link>
      </div>
    </li>
  );
}
