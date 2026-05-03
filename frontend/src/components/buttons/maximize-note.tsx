import type { LegacyAnimationControls } from 'motion/react';
import { useAtom } from 'jotai';
import { MotionIconButton } from '.';
import { easingFunctions, getDefaultButtonVariants } from '../../animations';
import { isFileMaximizedAtom } from '../../atoms';
import { SidebarRightCollapse } from '../../icons/sidebar-right-collapse';
import { Tooltip } from '../tooltip';

export function MaximizeNoteButton({
  animationControls,
  disabled,
}: {
  animationControls: LegacyAnimationControls;
  disabled?: boolean;
}) {
  const [isFileMaximized, setIsFileMaximized] = useAtom(isFileMaximizedAtom);

  return (
    <Tooltip
      content={(isFileMaximized ? 'Minimize' : 'Maximize') + ' (⌘S)'}
      placement="bottom"
    >
      <MotionIconButton
        onClick={() => {
          setIsFileMaximized((prev) => !prev);
          void animationControls.start({
            x: isFileMaximized ? [-40, 0] : [50, 0],
            transition: { ease: easingFunctions['ease-out-quint'] },
          });
        }}
        {...getDefaultButtonVariants({ disabled })}
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
