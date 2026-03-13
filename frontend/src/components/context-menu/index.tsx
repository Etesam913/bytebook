import { useAtom, useAtomValue, useSetAtom } from 'jotai/react';
import {
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  contextMenuDataAtom,
  contextMenuRefAtom,
  sidebarSelectionAtom,
} from '../../atoms';
import { isRegularMouseClick } from '../../utils/mouse';
import { DropdownItems } from '../dropdown/dropdown-items';

function adjustedPosition(
  x: number,
  y: number,
  contextMenuRefLocal: RefObject<HTMLDivElement | null>
) {
  if (!contextMenuRefLocal.current) return { x, y };

  const menuRect = contextMenuRefLocal.current.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;
  let adjustedY = y;
  let adjustedX = x;
  const heightBuffer = 14;
  const widthBuffer = 8;
  const menuHeight = 114; // hardcoded menu height

  if (y + menuHeight + heightBuffer > windowHeight) {
    adjustedY = windowHeight - menuHeight - heightBuffer;
  }

  if (x + menuRect.width + widthBuffer > windowWidth) {
    adjustedX = windowWidth - menuRect.width;
  }

  return { x: adjustedX, y: adjustedY };
}

export function ContextMenu() {
  const [{ isShowing, items, x, y }, setContextMenuData] =
    useAtom(contextMenuDataAtom);

  const [focusedIndex, setFocusedIndex] = useState(0);
  const { selections } = useAtomValue(sidebarSelectionAtom);
  const selectionCountLabel =
    selections.size > 99 ? '99+' : selections.size.toString();
  const setContextMenuRef = useSetAtom(contextMenuRefAtom);
  const contextMenuRefLocal = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Local state to hold the adjusted position
  const [position, setPosition] = useState({ x, y });

  const uniqueId = useId();
  const menuId = `context-menu-${uniqueId}`;

  // Set the ref atom once after mounting.
  useEffect(() => {
    setContextMenuRef(contextMenuRefLocal);
  }, [setContextMenuRef]);

  // Use useLayoutEffect to calculate the adjusted position after render.
  useLayoutEffect(() => {
    const newPosition = adjustedPosition(x, y, contextMenuRefLocal);
    setPosition(newPosition);
  }, [x, y]); // recalc whenever x or y change

  // Ensuring the dialog is open or closed based on the isShowing state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isShowing) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isShowing]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const closeMenu = () =>
      setContextMenuData((prev) =>
        prev.isShowing ? { ...prev, isShowing: false } : prev
      );

    const handleCancel = (event: Event) => {
      event.preventDefault();
      closeMenu();
    };

    const handleClose = () => {
      closeMenu();
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, [setContextMenuData]);

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent border-none p-0 max-w-none max-h-none w-full h-full"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          isRegularMouseClick(event.nativeEvent)
        ) {
          setContextMenuData((prev) =>
            prev.isShowing ? { ...prev, isShowing: false } : prev
          );
        }
      }}
    >
      {isShowing && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute"
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          >
            {selections.size > 0 && (
              <div
                className="absolute rounded-full font-bold min-w-6 h-6 px-1 text-xs leading-none pointer-events-none text-white flex justify-center items-center -left-2 bg-(--accent-color) z-60"
              >
                {selectionCountLabel}
              </div>
            )}
            <DropdownItems
              onChange={async (item) => {
                if (item.onChange) {
                  item.onChange();
                }
              }}
              ref={contextMenuRefLocal}
              className="w-fit text-sm overflow-hidden"
              items={items}
              isOpen={isShowing}
              setIsOpen={(value: boolean) =>
                setContextMenuData((prev) => ({ ...prev, isShowing: value }))
              }
              setFocusIndex={setFocusedIndex}
              focusIndex={focusedIndex}
              menuId={menuId}
              buttonId={undefined}
              valueIndex={undefined}
            />
          </div>
        </div>
      )}
    </dialog>
  );
}
