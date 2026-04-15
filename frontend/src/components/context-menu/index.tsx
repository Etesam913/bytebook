import { useAtom, useAtomValue } from 'jotai/react';
import { useRef } from 'react';
import type { Key } from 'react-aria-components';
import { Popover } from 'react-aria-components';
import { contextMenuDataAtom, sidebarSelectionAtom } from '../../atoms';
import { AppMenu, AppMenuItem } from '../menu';
import {
  createSelectionKey,
  FILE_SELECTION_PREFIX,
} from '../../utils/selection';

export function ContextMenu() {
  const [{ isShowing, items, x, y, targetId }, setContextMenuData] =
    useAtom(contextMenuDataAtom);

  const { selections } = useAtomValue(sidebarSelectionAtom);
  const isTargetInSelection =
    targetId != null &&
    selections.has(createSelectionKey(FILE_SELECTION_PREFIX, targetId));

  const effectiveCount = isTargetInSelection
    ? selections.size
    : targetId !== null
      ? 1
      : selections.size;

  const selectionCountLabel =
    effectiveCount > 99 ? '99+' : effectiveCount.toString();

  const triggerRef = useRef<HTMLSpanElement>(null);

  function handleAction(key: Key) {
    const item = items.find((i) => i.value === String(key));
    if (item?.onChange) {
      item.onChange();
    }
    setContextMenuData((prev) => ({ ...prev, isShowing: false }));
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setContextMenuData((prev) =>
        prev.isShowing ? { ...prev, isShowing: false } : prev
      );
    }
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: x,
          top: y,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      >
        <span ref={triggerRef} />
      </div>
      <Popover
        triggerRef={triggerRef}
        isOpen={isShowing}
        onOpenChange={handleOpenChange}
        placement="bottom start"
        shouldFlip
        className="rounded-md border-[0.078125rem] border-zinc-300 bg-zinc-50 shadow-xl dark:border-zinc-600 dark:bg-zinc-700 outline-hidden font-display"
        data-exclude-from-on-click-outside="true"
      >
        {effectiveCount > 0 && (
          <div
            aria-label={`${selectionCountLabel} items selected`}
            className="absolute rounded-full font-bold min-w-6 h-6 px-1 text-xs leading-none pointer-events-none text-white flex justify-center items-center -left-2 -top-2 bg-(--accent-color) z-60"
          >
            {selectionCountLabel}
          </div>
        )}
        <AppMenu
          onAction={handleAction}
          aria-label="Context menu"
          className="w-fit text-sm overflow-hidden"
          autoFocus="first"
        >
          {items.map((item) => (
            <AppMenuItem key={item.value} id={item.value}>
              {item.label}
            </AppMenuItem>
          ))}
        </AppMenu>
      </Popover>
    </>
  );
}
