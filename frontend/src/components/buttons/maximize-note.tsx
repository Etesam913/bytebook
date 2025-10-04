import type { LegacyAnimationControls } from 'motion/react';
import { useAtom } from 'jotai';
import { MotionIconButton } from '.';
import { easingFunctions, getDefaultButtonVariants } from '../../animations';
import { isNoteMaximizedAtom } from '../../atoms';
import { SidebarRightCollapse } from '../../icons/sidebar-right-collapse';
import { Tooltip } from '../tooltip';

export function MaximizeNoteButton({
  animationControls,
  disabled,
}: {
  animationControls: LegacyAnimationControls;
  disabled?: boolean;
}) {
  const [isNoteMaximized, setIsNoteMaximized] = useAtom(isNoteMaximizedAtom);

  return (
    <Tooltip
      content={isNoteMaximized ? 'Minimize note' : 'Maximize note'}
      placement="bottom"
    >
      <MotionIconButton
        onClick={() => {
          setIsNoteMaximized((prev) => !prev);
          animationControls.start({
            x: isNoteMaximized ? [-40, 0] : [50, 0],
            transition: { ease: easingFunctions['ease-out-quint'] },
          });
        }}
        {...getDefaultButtonVariants({ disabled })}
        type="button"
        animate={{ rotate: isNoteMaximized ? 180 : 0 }}
      >
        <SidebarRightCollapse
          strokeWidth={1.75}
          className="will-change-transform"
          title={isNoteMaximized ? 'Minimize' : 'Maximize'}
        />
      </MotionIconButton>
    </Tooltip>
  );
}
