import { useSetAtom } from 'jotai/react';
import { dialogDataAtom } from '../../atoms';
import { Gear } from '../../icons/gear';
import { SettingsDialog } from '../settings-dialog';

export function SettingsButton() {
  const setDialogData = useSetAtom(dialogDataAtom);
  return (
    <button
      type="button"
      onClick={() => {
        setDialogData({
          isOpen: true,
          isPending: false,
          title: 'Settings',
          dialogClassName: 'w-[min(55rem,90vw)]',
          children: () => <SettingsDialog />,
          onSubmit: async () => {
            return new Promise((resolve) => {
              resolve(true);
            });
          },
        });
      }}
      className="flex gap-1 items-center hover:bg-zinc-100 dark:hover:bg-zinc-650 p-1 rounded-md transition-colors"
    >
      <Gear /> Settings
    </button>
  );
}
