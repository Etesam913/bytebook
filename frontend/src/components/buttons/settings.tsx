import { Button } from 'react-aria-components/Button';
import { Gear } from '@/icons/gear';
import { useOpenSettingsDialog } from '@hooks/dialogs';
import { isFullscreenAtom } from '@/atoms';
import { useAtomValue } from 'jotai';
import { cn } from '@utils/string-formatting';

export function SettingsButton() {
  const openSettings = useOpenSettingsDialog();
  const isFullscreen = useAtomValue(isFullscreenAtom);
  return (
    <Button
      onPress={openSettings}
      className={cn(
        'flex gap-1 items-center hover:bg-zinc-100 dark:hover:bg-zinc-650 p-1 pl-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color)',
        !isFullscreen && 'rounded-bl-2xl'
      )}
    >
      <Gear /> Settings
    </Button>
  );
}
