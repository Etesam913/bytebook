import { type ReactNode } from 'react';
import { Link } from 'wouter';
import { Note } from '../../icons/page';
import { createGhostElementFromHtmlElement } from '../../utils/draggable';
import { Tooltip } from '../tooltip';

export function AccordionItem({
  to,
  itemName,
  onContextMenu,
  icon,
  tooltipContent,
}: {
  to: string;
  itemName: string;
  onContextMenu?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  icon?: ReactNode;
  tooltipContent?: ReactNode;
}) {
  const link = (
    <Link
      onContextMenu={onContextMenu}
      draggable
      target="_blank"
      onDragStart={(e) => {
        const dragElement = e.target as HTMLElement;
        const ghostElement = createGhostElementFromHtmlElement({
          element: dragElement,
          classNames: ['dragging'],
        });
        document.body.appendChild(ghostElement);
        e.dataTransfer.setDragImage(ghostElement, -25, -25);
        // Clean up the ghost element after the drag ends
        function handleDragEnd() {
          ghostElement.remove();
          dragElement.removeEventListener('dragend', handleDragEnd);
        }

        dragElement.addEventListener('dragend', handleDragEnd);
      }}
      className="flex min-w-0 flex-1 items-center gap-2 overflow-x-hidden rounded-md px-2 py-1"
      to={to}
    >
      {icon ?? (
        <Note
          className="min-w-4 will-change-transform"
          width="1rem"
          height="1rem"
        />
      )}
      <p className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
        {itemName}
      </p>
    </Link>
  );

  return (
    <div className="flex min-w-0 select-none items-center gap-2 overflow-hidden pr-1 text-zinc-600 dark:text-zinc-300">
      {tooltipContent ? (
        <Tooltip placement="right" content={tooltipContent}>
          {link}
        </Tooltip>
      ) : (
        link
      )}
    </div>
  );
}
