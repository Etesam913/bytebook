import { PaletteBody } from './palette-body';
import { CreateNote } from './create-note';
import { useAddTreeItemMutation } from '@hooks/tree-items';
import { FILE_TYPE } from '@utils/tree-item-types';
import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue, useStore } from 'jotai';
import { Dialog as AriaDialog } from 'react-aria-components/Dialog';
import { Modal, ModalOverlay } from 'react-aria-components/Modal';
import {
  backendQueryAtom,
  commandPaletteModeAtom,
  contextMenuDataAtom,
  dialogDataAtom,
  focusTreeFilterInputAtom,
  fileSidebarOpenStateAtom,
  isFileMaximizedAtom,
  treeFilterQueryAtom,
} from '@/atoms';
import { useCurrentWindowWailsEvent } from '@hooks/events';
import { QUICK_OPEN, COMMAND_PALETTE_OPEN } from '@bindings/util/event-names';

export function CommandPalette() {
  const [mode, setMode] = useAtom(commandPaletteModeAtom);
  const [creating, setCreating] = useState(false);
  const createNote = useAddTreeItemMutation();
  function dismiss() {
    if (createNote.isPending) return;
    setCreating(false);
    createNote.reset();
    setMode(null);
  }
  const dialog = useAtomValue(dialogDataAtom);
  const backend = useAtomValue(backendQueryAtom);
  const store = useStore();
  const pendingAction = useRef<(() => void) | null>(null);
  const blocked = dialog.isOpen || backend.isLoading;

  function openMode(nextMode: 'files' | 'commands') {
    if (createNote.isPending) return;
    if (
      store.get(dialogDataAtom).isOpen ||
      store.get(backendQueryAtom).isLoading
    )
      return;
    store.set(contextMenuDataAtom, (previous) => ({
      ...previous,
      isShowing: false,
    }));
    setCreating(false);
    createNote.reset();
    setMode(store.get(commandPaletteModeAtom) === null ? nextMode : null);
  }
  useCurrentWindowWailsEvent(QUICK_OPEN, () => {
    openMode('files');
  });
  useCurrentWindowWailsEvent(COMMAND_PALETTE_OPEN, () => {
    openMode('commands');
  });

  useEffect(() => {
    if (blocked) setMode(null);
  }, [blocked, setMode]);

  useEffect(() => {
    if (mode !== null || !pendingAction.current) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    // Let the closing focus scope restore focus before the next surface takes it.
    const frame = requestAnimationFrame(action);
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  function closeAndRun(action: () => void) {
    pendingAction.current = action;
    setMode(null);
  }

  if (mode === null || blocked) return null;
  return (
    <ModalOverlay
      isOpen
      isDismissable={!createNote.isPending}
      isKeyboardDismissDisabled={createNote.isPending}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
      className="fixed inset-0 z-60 bg-black/40 flex items-start justify-center pt-[min(15vh,8rem)] px-4"
    >
      <Modal className="w-[min(40rem,90vw)] outline-none">
        <AriaDialog
          aria-label={
            creating
              ? 'Create note'
              : mode === 'files'
                ? 'Quick Open'
                : 'Command Palette'
          }
          className="rounded-xl border border-zinc-300 bg-zinc-50 shadow-2xl outline-none dark:border-zinc-700 dark:bg-zinc-800"
        >
          <div
            onKeyDownCapture={(event) => {
              if (event.key === 'Backspace' || event.key === 'Delete') {
                // Keep editing keys out of Autocomplete's synthetic menu events.
                event.stopPropagation();
                if (
                  !(
                    event.target instanceof HTMLInputElement ||
                    event.target instanceof HTMLTextAreaElement
                  )
                ) {
                  event.preventDefault();
                }
              }
              if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.stopPropagation();
                dismiss();
              }
            }}
          >
            {creating ? (
              <CreateNote
                isPending={createNote.isPending}
                error={createNote.error}
                onBack={() => setCreating(false)}
                onShowFiles={() =>
                  closeAndRun(() => {
                    store.set(isFileMaximizedAtom, false);
                    store.set(focusTreeFilterInputAtom);
                  })
                }
                onSubmit={async ({ title, parent }) => {
                  try {
                    await createNote.mutateAsync({
                      parentFolderPath: parent,
                      addType: FILE_TYPE,
                      newName: title,
                    });
                    setCreating(false);
                    closeAndRun(() => {
                      store.set(treeFilterQueryAtom, '');
                      store.set(isFileMaximizedAtom, false);
                      store.set(fileSidebarOpenStateAtom, { files: true });
                    });
                  } catch {
                    // Keep the folder picker available to retry after a failure.
                  }
                }}
              />
            ) : (
              <PaletteBody
                key={mode}
                mode={mode}
                onCreateNote={() => {
                  createNote.reset();
                  setCreating(true);
                }}
                closeAndRun={closeAndRun}
              />
            )}
          </div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
