import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { SelectionAlwaysOnDisplay } from '@lexical/react/LexicalSelectionAlwaysOnDisplay';
import { AnimatePresence, motion } from 'motion/react';
import {
  type CSSProperties,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
} from 'react';
import {
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import type { UseInteractionsReturn } from '@floating-ui/react';
import { easingFunctions, getDefaultButtonVariants } from '@/animations';
import { SubmitLink } from '@/icons/submit-link';
import type { FloatingDataType } from '@/types';
import { MotionIconButton } from '@components/buttons';
import { FilePen } from '@/icons/file-pen';
import { Trash } from '@/icons/trash';
import { Tooltip } from '@components/tooltip';
import { cn } from '@utils/string-formatting';
import {
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  LinkNode,
  TOGGLE_LINK_COMMAND,
} from '@lexical/link';
import { $getNearestNodeOfType } from '@lexical/utils';
import { AppTextField } from '@components/input';
import { $setSelection } from 'lexical';
import { useFocusWithin } from 'react-aria';

// Styles the persistent selection to match Bytebook's native text selection.
function stylePersistentSelection(nodes: readonly HTMLElement[]) {
  for (const node of nodes) {
    node.dataset.selectionHighlight = 'true';
    node.style.background = 'var(--accent-color-highlight)';
    node.style.marginTop = '-1.5px';
    node.style.paddingTop = '4px';
    node.style.paddingBottom = '0px';
  }
}

// Shows link actions on hover and an editor for creating or updating links.
export function FloatingLinkPreview({
  floatingData,
  setFloatingData,
  noteContainerRef,
  floatingStyles,
  setFloating,
  getFloatingProps,
  closeMenu,
}: {
  floatingData: FloatingDataType;
  setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
  noteContainerRef: RefObject<HTMLDivElement | null>;
  floatingStyles: CSSProperties;
  setFloating: (node: HTMLElement | null) => void;
  getFloatingProps: UseInteractionsReturn['getFloatingProps'];
  closeMenu: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const isLinkMenuOpen = floatingData.isOpen && floatingData.type === 'link';
  const isLinkPreviewOpen =
    floatingData.isOpen && floatingData.type === 'link-preview';
  const isMenuOpen = isLinkMenuOpen || isLinkPreviewOpen;
  const shouldKeepSelectionVisible =
    isLinkMenuOpen &&
    floatingData.previousSelection !== null &&
    !floatingData.previousSelection.isCollapsed();
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keeps the preview open while the pointer moves onto its actions.
  function cancelHoverDismiss() {
    // Clear any pending dismissal before the pointer returns to the preview.
    if (hoverTimeout.current !== null) clearTimeout(hoverTimeout.current);
  }

  // Closes a hover preview after giving the pointer time to enter it.
  function dismissHoverPreview() {
    cancelHoverDismiss();
    hoverTimeout.current = setTimeout(() => {
      const selectedLinkKey = editor.read(() => {
        const selection = $getSelection();
        // Only a caret inside the same link should keep its preview open.
        if (!$isRangeSelection(selection) || !selection.isCollapsed())
          return null;
        const link = $getNearestNodeOfType(
          selection.anchor.getNode(),
          LinkNode
        );
        return link?.getKey() ?? null;
      });
      setFloatingData((previous) =>
        previous.type === 'link-preview' &&
        previous.linkNodeKey !== selectedLinkKey
          ? {
              isOpen: false,
              type: null,
              top: 0,
              left: 0,
              previousSelection: null,
            }
          : previous
      );
    }, 250);
  }

  useEffect(() => {
    const unregister = editor.registerRootListener((root, previousRoot) => {
      previousRoot?.removeEventListener('pointerover', onPointerOver);
      previousRoot?.removeEventListener('pointerout', dismissHoverPreview);
      root?.addEventListener('pointerover', onPointerOver);
      root?.addEventListener('pointerout', dismissHoverPreview);
    });
    return () => {
      unregister();
      cancelHoverDismiss();
    };

    // Opens the preview for the link currently under the pointer.
    function onPointerOver(event: PointerEvent) {
      // Do not replace an open editor or show actions in read-only mode.
      if (isLinkMenuOpen || !editor.isEditable()) return;
      const anchor =
        event.target instanceof Element ? event.target.closest('a') : null;
      // Ignore hover targets that are not inside a rendered link.
      if (!anchor) return;
      cancelHoverDismiss();

      editor.read(() => {
        const node = $getNearestNodeFromDOMNode(anchor);
        const link = node && $getNearestNodeOfType(node, LinkNode);
        // Ignore anchors without an active Lexical link node.
        if (!link || ($isAutoLinkNode(link) && link.getIsUnlinked())) return;
        const bounds = anchor.getBoundingClientRect();
        const container = noteContainerRef.current;
        const containerBounds = container?.getBoundingClientRect();
        setFloatingData({
          isOpen: true,
          type: 'link-preview',
          top:
            bounds.bottom -
            (containerBounds?.top ?? 0) +
            (container?.scrollTop ?? 0),
          left: bounds.left - (containerBounds?.left ?? 0) + bounds.width / 2,
          previousUrl: link.getURL(),
          linkNodeKey: link.getKey(),
          previousSelection: null,
        });
      });
    }
  }, [editor, isLinkMenuOpen, noteContainerRef, setFloatingData]);

  // Applies, creates, or removes a link based on the submitted URL.
  function submitLink(url: string | null) {
    editor.update(() => {
      // Hovering does not move the selection. Keep edits tied to the original link.
      if (floatingData.linkNodeKey) {
        const node = $getNodeByKey(floatingData.linkNodeKey);
        // The link may have been removed while the editor was open.
        if (!$isLinkNode(node) || !node.isAttached()) return;
        // A missing URL means the existing link should be removed.
        if (url === null) {
          // Mark automatic links as unlinked so the matcher does not recreate them.
          if ($isAutoLinkNode(node)) {
            node.setIsUnlinked(true);
          } else {
            for (const child of node.getChildren()) node.insertBefore(child);
            node.remove();
          }
          // Replace automatic links so the edited URL is independent of their text.
        } else if ($isAutoLinkNode(node)) {
          const link = $createLinkNode(url, {
            rel: node.getRel(),
            target: node.getTarget(),
            title: node.getTitle(),
          });
          node.replace(link, true);
        } else {
          node.setURL(url);
        }
      } else {
        // Restore the selection that was active before the URL input took focus.
        if (floatingData.previousSelection)
          $setSelection(floatingData.previousSelection.clone());
        const selection = $getSelection();
        // With no selected label, insert the URL itself as linked text.
        if (url && $isRangeSelection(selection) && selection.isCollapsed()) {
          const text = $createTextNode(url).setFormat(selection.format);
          selection.insertNodes([$createLinkNode(url).append(text)]);
        } else {
          // A null payload removes the link.
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, url ? { url } : null);
        }
      }
    });
    closeMenu();
  }

  // Close the link editor when focus leaves it (e.g. Tab or clicking the editor).
  const { focusWithinProps } = useFocusWithin({
    isDisabled: !isLinkMenuOpen && !isLinkPreviewOpen,
    onBlurWithin: () => {
      closeMenu();
    },
  });

  return (
    <>
      {shouldKeepSelectionVisible && (
        <SelectionAlwaysOnDisplay onReposition={stylePersistentSelection} />
      )}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.form
            ref={setFloating}
            aria-label={isLinkMenuOpen ? 'Link editor' : 'Link actions'}
            data-testid="floating-toolbar"
            onPointerEnter={cancelHoverDismiss}
            onPointerLeave={dismissHoverPreview}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            style={floatingStyles}
            transition={{ ease: easingFunctions['ease-out-circ'] }}
            className={cn(
              'bg-zinc-50/92.5 dark:bg-zinc-700/92.5 p-1 rounded-md shadow-lg flex items-center gap-3 z-50 border border-zinc-300 dark:border-zinc-600',
              isLinkPreviewOpen && 'gap-0.5'
            )}
            onSubmit={(e) => {
              e.preventDefault();
              // The hover-only preview does not submit link changes.
              if (!isLinkMenuOpen) {
                return;
              }

              let newUrl: string | null =
                inputRef.current?.value.trim() ?? null;
              // Treat an empty input as a request to remove the link.
              if (newUrl === '' || newUrl === null) {
                newUrl = null;
              }
              submitLink(newUrl);
            }}
            {...getFloatingProps(focusWithinProps)}
          >
            {isLinkPreviewOpen && (
              <>
                <span className="max-w-64 truncate px-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  {floatingData.previousUrl}
                </span>
                <span
                  aria-hidden="true"
                  className="mx-1 h-4 border-l border-zinc-300 dark:border-zinc-600"
                />
                <Tooltip content="Edit link">
                  <MotionIconButton
                    {...getDefaultButtonVariants()}
                    type="button"
                    aria-label="Edit link"
                    className="hover:bg-zinc-200 focus-visible:bg-zinc-200 dark:hover:bg-zinc-600 dark:focus-visible:bg-zinc-600"
                    onPress={() => {
                      editor.read(() => {
                        const selection = $getSelection();
                        setFloatingData({
                          ...floatingData,
                          type: 'link',
                          previousSelection: $isRangeSelection(selection)
                            ? selection.clone()
                            : null,
                        });
                      });
                    }}
                  >
                    <FilePen width="1rem" height="1rem" />
                  </MotionIconButton>
                </Tooltip>
                <Tooltip content="Remove link">
                  <MotionIconButton
                    {...getDefaultButtonVariants()}
                    type="button"
                    aria-label="Remove link"
                    className="hover:bg-zinc-200 focus-visible:bg-zinc-200 dark:hover:bg-zinc-600 dark:focus-visible:bg-zinc-600"
                    onPress={() => submitLink(null)}
                  >
                    <Trash width="1rem" height="1rem" />
                  </MotionIconButton>
                </Tooltip>
              </>
            )}
            {isLinkMenuOpen && (
              <>
                <AppTextField
                  key={floatingData.linkNodeKey ?? 'new-link'}
                  ref={inputRef}
                  aria-label="URL"
                  defaultValue={floatingData.previousUrl ?? 'https://'}
                  autoFocus
                  onFocus={(event) => event.target.select()}
                  inputClassName="text-sm w-64"
                  maxLength={undefined}
                  onKeyDown={(e) => {
                    // Escape cancels editing and restores the original selection.
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      closeMenu();

                      editor.update(() => {
                        $setSelection(
                          floatingData.previousSelection?.clone() ?? null
                        );
                      });
                    }
                  }}
                />
                <Tooltip content="Submit link">
                  <MotionIconButton
                    type="submit"
                    aria-label="Submit link"
                    className="hover:bg-zinc-200 focus-visible:bg-zinc-200 dark:hover:bg-zinc-600 dark:focus-visible:bg-zinc-600"
                    {...getDefaultButtonVariants()}
                  >
                    <SubmitLink height="1rem" width="1rem" />
                  </MotionIconButton>
                </Tooltip>
              </>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </>
  );
}
