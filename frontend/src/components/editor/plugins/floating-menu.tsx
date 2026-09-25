import {
  autoUpdate,
  offset,
  flip,
  shift,
  useFloating,
  useInteractions,
  useDismiss,
} from '@floating-ui/react';
import {
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useEffect,
} from 'react';
import type { FloatingDataType } from '@/types';
import { FloatingLinkPreview } from './floating-link-preview';
import { FloatingTextFormatMenu } from './floating-text-format';

export function FloatingMenuPlugin({
  floatingData,
  setFloatingData,
  noteContainerRef,
  children,
}: {
  floatingData: FloatingDataType;
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
  noteContainerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const isTextFormatOpen =
    floatingData.isOpen && floatingData.type === 'text-format';
  const isLinkOpen =
    floatingData.isOpen &&
    (floatingData.type === 'link' || floatingData.type === 'link-preview');

  function closeMenu() {
    setFloatingData({
      isOpen: false,
      type: null,
      top: 0,
      left: 0,
      previousSelection: null,
    });
  }

  const textFormatPosition = useFloatingMenuPosition({
    floatingData,
    noteContainerRef,
    isOpen: isTextFormatOpen,
    closeMenu,
  });
  const linkPosition = useFloatingMenuPosition({
    floatingData,
    noteContainerRef,
    isOpen: isLinkOpen,
    closeMenu,
  });

  return (
    <>
      <FloatingTextFormatMenu isOpen={isTextFormatOpen} {...textFormatPosition}>
        {children}
      </FloatingTextFormatMenu>
      <FloatingLinkPreview
        floatingData={floatingData}
        setFloatingData={setFloatingData}
        noteContainerRef={noteContainerRef}
        closeMenu={closeMenu}
        {...linkPosition}
      />
    </>
  );
}

function useFloatingMenuPosition({
  floatingData,
  noteContainerRef,
  isOpen,
  closeMenu,
}: {
  floatingData: FloatingDataType;
  noteContainerRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  closeMenu: () => void;
}) {
  // Floating state stores coordinates relative to the note container.
  const virtualElement = {
    getBoundingClientRect: () => {
      const noteContainerBounds =
        noteContainerRef.current?.getBoundingClientRect();
      const containerTop = noteContainerBounds?.top ?? 0;
      const containerLeft = noteContainerBounds?.left ?? 0;
      const scrollY = noteContainerRef.current?.scrollTop ?? 0;

      // Convert container-relative coordinates to viewport coordinates
      const viewportLeft = floatingData.left + containerLeft;
      const viewportTop = floatingData.top + containerTop - scrollY;

      return {
        width: 0,
        height: 0,
        x: viewportLeft,
        y: viewportTop,
        top: viewportTop,
        left: viewportLeft,
        right: viewportLeft,
        bottom: viewportTop,
      };
    },
  };

  const floating = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      if (!open) closeMenu();
    },
    placement:
      floatingData.type === 'text-format' ||
      (floatingData.type === 'link' && !floatingData.linkNodeKey)
        ? 'top'
        : 'bottom',
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  const dismiss = useDismiss(floating.context, {
    escapeKey: floatingData.type !== 'link', // Handle Escape manually for link menu
    outsidePressEvent: 'mousedown',
    outsidePress: () => {
      closeMenu();
      return true;
    },
  });

  const { getFloatingProps } = useInteractions([dismiss]);

  // Set reference element when menu opens
  useEffect(() => {
    if (isOpen) {
      floating.refs.setReference(virtualElement);
    }
  }, [isOpen, floatingData.left, floatingData.top]);

  function setFloating(node: HTMLElement | null) {
    floating.refs.setFloating(node);
  }

  return {
    floatingStyles: floating.floatingStyles,
    setFloating,
    getFloatingProps,
  };
}
