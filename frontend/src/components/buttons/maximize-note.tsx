import type { LegacyAnimationControls } from 'motion/react';
import { useAtomValue, useStore } from 'jotai';
import { MotionIconButton } from '@components/buttons';
import { getDefaultButtonVariants } from '@/animations';
import { isFileMaximizedAtom } from '@/atoms';
import { SidebarRightCollapse } from '@/icons/sidebar-right-collapse';
import { Tooltip } from '@components/tooltip';
import { toggleFileMaximized } from '@hooks/file-maximize';

export function MaximizeNoteButton({
  animationControls,
  disabled,
}: {
  animationControls: LegacyAnimationControls;
  disabled?: boolean;
}) {
  const isFileMaximized = useAtomValue(isFileMaximizedAtom);
  const store = useStore();

  return (
    <Tooltip
      content={isFileMaximized ? 'Minimize' : 'Maximize'}
      shortcut="⌘S"
      placement="bottom"
    >
      <MotionIconButton
        aria-label={isFileMaximized ? 'Minimize note' : 'Maximize note'}
        onPress={() => toggleFileMaximized(store, animationControls)}
        {...getDefaultButtonVariants({ disabled })}
        isDisabled={disabled}
        type="button"
        initial={{ rotate: isFileMaximized ? 180 : 0 }}
        animate={{ rotate: isFileMaximized ? 180 : 0 }}
      >
        <SidebarRightCollapse
          strokeWidth={1.75}
          className="will-change-transform"
        />
      </MotionIconButton>
    </Tooltip>
  );
}
