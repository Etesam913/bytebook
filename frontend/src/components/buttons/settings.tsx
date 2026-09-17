import { Button } from 'react-aria-components/Button';
import { Gear } from '@/icons/gear';
import { useOpenSettingsDialog } from '@hooks/dialogs';

export function SettingsButton() {
  const openSettings = useOpenSettingsDialog();
  return (
    <Button
      onPress={openSettings}
      className="flex gap-1 items-center hover:bg-zinc-100 dark:hover:bg-zinc-650 p-1 pl-1.5 rounded-md rounded-bl-2xl outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color)"
    >
      <Gear /> Settings
    </Button>
  );
}
