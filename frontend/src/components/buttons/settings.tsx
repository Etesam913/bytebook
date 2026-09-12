import { useSetAtom } from 'jotai/react';
import { Button } from 'react-aria-components/Button';
import { dialogDataAtom } from '@/atoms';
import { Gear } from '@/icons/gear';
import { SettingsDialog } from '@components/settings-dialog';

export function SettingsButton() {
  const setDialogData = useSetAtom(dialogDataAtom);
  return (
    <Button
      onPress={() => {
        setDialogData({
          isOpen: true,
          isPending: false,
          title: 'Settings',
          dialogClassName: 'w-[min(55rem,90vw)] rounded-2xl',
          children: () => <SettingsDialog />,
          onSubmit: async () => {
            return new Promise((resolve) => {
              resolve(true);
            });
          },
        });
      }}
      className="flex gap-1 items-center hover:bg-zinc-100 dark:hover:bg-zinc-650 p-1 pl-1.5 rounded-md rounded-bl-2xl outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color)"
    >
      <Gear /> Settings
    </Button>
  );
}
