import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AnimatePresence, motion } from 'motion/react';
import {
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
} from 'react';
import {
  autoUpdate,
  offset,
  flip,
  shift,
  useFloating,
  useInteractions,
  FloatingPortal,
  useDismiss,
} from '@floating-ui/react';
import { easingFunctions, getDefaultButtonVariants } from '../../../animations';
import { SubmitLink } from '../../../icons/submit-link';
import type { FloatingDataType } from '../../../types';
import { MotionButton } from '../../buttons';
import { FORMAT_TEXT_COMMAND } from 'lexical';
import { TOGGLE_LINK_COMMAND } from '../nodes/link';
import { Input } from '../../input';
import { $setSelection } from 'lexical';

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
  const [editor] = useLexicalComposerContext();
  const isTextFormatMenuOpen =
    floatingData.isOpen && floatingData.type === 'text-format';
  const isLinkMenuOpen = floatingData.isOpen && floatingData.type === 'link';
  const isMenuOpen = floatingData.isOpen && floatingData.type !== null;
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Create virtual reference element from floatingData coordinates
  // floatingData coordinates are relative to noteContainer, so we need to convert to viewport coordinates
  // Original calculation: top = viewport_top - container_top + scroll
  // To convert back: viewport_top = floatingData.top + container_top - scroll
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

  // Dynamic offset based on menu type
  const menuOffset = floatingData.type === 'text-format' ? 25 : 12;

  // Single floating setup for both menu types
  const floating = useFloating({
    open: isMenuOpen,
    placement: 'bottom',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(menuOffset),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
    ],
  });

  const dismiss = useDismiss(floating.context, {
    escapeKey: floatingData.type !== 'link', // Handle Escape manually for link menu
    outsidePressEvent: 'mousedown',
    outsidePress: () => {
      setFloatingData({
        isOpen: false,
        type: null,
        top: 0,
        left: 0,
        previousSelection: null,
      });
      return true;
    },
  });

  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    function handleBlur(e: FocusEvent) {
      if (!isLinkMenuOpen) return;

      const floatingElement = floating.refs.floating.current;

      // relatedTarget is where the focus is moving to, supported for blur on elements (not on window)
      const relatedTarget = (e.relatedTarget ||
        (document.activeElement as Node)) as Node | null;

      if (
        floatingElement &&
        relatedTarget &&
        !floatingElement.contains(relatedTarget)
      ) {
        setFloatingData({
          isOpen: false,
          type: null,
          top: 0,
          left: 0,
          previousSelection: null,
        });
      }
    }

    // Attach the blur event to the floating element
    const floatingNode = floating.refs.floating.current;

    if (floatingNode) {
      floatingNode.addEventListener('blur', handleBlur, true);
    }
    return () => {
      if (floatingNode) {
        floatingNode.removeEventListener('blur', handleBlur, true);
      }
    };
  }, [isLinkMenuOpen, floating.refs.floating, setFloatingData]);

  // Set reference element when menu opens
  useEffect(() => {
    if (isMenuOpen) {
      floating.refs.setReference(virtualElement);

      if (isLinkMenuOpen && floatingData.previousSelection) {
        editor.update(() => {
          $setSelection(floatingData.previousSelection);
          // editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight');
        });
      }
    }
  }, [isMenuOpen, floatingData.left, floatingData.top]);

  return (
    <FloatingPortal>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.form
            ref={(node) => {
              floating.refs.setFloating(node);
              formRef.current = node;
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={floating.floatingStyles}
            transition={{ ease: easingFunctions['ease-out-circ'] }}
            className={
              isTextFormatMenuOpen
                ? 'bg-white dark:bg-zinc-750 p-1 rounded-md shadow-lg flex items-center gap-2 z-10 border border-zinc-300 dark:border-zinc-600'
                : 'bg-zinc-50 dark:bg-zinc-800 p-1 rounded-md bg-opacity-95 shadow-lg flex items-center gap-3 z-50 border-[1.25px] border-zinc-300 dark:border-zinc-700'
            }
            onSubmit={(e) => {
              e.preventDefault();
              if (!isLinkMenuOpen) {
                return;
              }

              let newUrl: string | null =
                inputRef.current?.value.trim() ?? null;
              if (newUrl === '' || newUrl === null) {
                newUrl = null;
              }
              editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
                url: newUrl,
              });
              setFloatingData({
                isOpen: false,
                type: null,
                top: 0,
                left: 0,
                previousSelection: null,
              });
            }}
            onKeyDown={(e) => {
              if (!isLinkMenuOpen) return;
              if (e.key === 'Escape') {
                setFloatingData({
                  isOpen: false,
                  type: null,
                  top: 0,
                  left: 0,
                  previousSelection: null,
                });

                setTimeout(() => {
                  editor.update(() => {
                    $setSelection(floatingData.previousSelection);
                  });
                }, 200);
              }
            }}
            {...getFloatingProps()}
          >
            {isTextFormatMenuOpen && children}
            {isLinkMenuOpen && (
              <>
                <Input
                  ref={inputRef}
                  labelProps={{}}
                  inputProps={{
                    defaultValue: floatingData.previousUrl ?? 'https://',
                    // autoFocus: true,
                    className: 'text-sm w-64',
                    maxLength: undefined,
                  }}
                />
                <MotionButton type="submit" {...getDefaultButtonVariants()}>
                  <SubmitLink height={18} width={18} />
                </MotionButton>
              </>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
