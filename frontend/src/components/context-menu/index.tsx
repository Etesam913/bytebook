import { motion } from 'motion/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai/react';
import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useId,
} from 'react';
import {
  contextMenuDataAtom,
  contextMenuRefAtom,
  selectionRangeAtom,
} from '../../atoms';
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
  const selectionRange = useAtomValue(selectionRangeAtom);
  const setContextMenuRef = useSetAtom(contextMenuRefAtom);
  const contextMenuRefLocal = useRef<HTMLDivElement>(null);

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

  return (
    <>
      {isShowing && (
        <div
          className="absolute z-50"
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        >
          {selectionRange.size > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.075 } }}
              className="absolute rounded-full font-bold w-5 h-5 text-xs pointer-events-none text-white flex justify-center items-center p-0.5 -left-2 bg-red-500 z-60"
            >
              {selectionRange.size}
            </motion.div>
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
      )}
    </>
  );
}
