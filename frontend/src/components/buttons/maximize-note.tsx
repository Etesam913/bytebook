import type { AnimationControls } from 'motion/react';
import { useAtom } from 'jotai';
import { MotionIconButton } from '.';
import { easingFunctions, getDefaultButtonVariants } from '../../animations';
import { isNoteMaximizedAtom } from '../../atoms';
import { SidebarRightCollapse } from '../../icons/sidebar-right-collapse';

export function MaximizeNoteButton({
  animationControls,
  disabled,
}: {
  animationControls: AnimationControls;
  disabled?: boolean;
}) {
  const [isNoteMaximized, setIsNoteMaximized] = useAtom(isNoteMaximizedAtom);

  return (
    <MotionIconButton
      onClick={() => {
        setIsNoteMaximized((prev) => !prev);
        animationControls.start({
          x: isNoteMaximized ? [-40, 0] : [50, 0],
          transition: { ease: easingFunctions['ease-out-quint'] },
        });
      }}
      {...getDefaultButtonVariants(disabled)}
      type="button"
      animate={{ rotate: isNoteMaximized ? 180 : 0 }}
    >
      <SidebarRightCollapse
        className="will-change-transform"
        title={isNoteMaximized ? 'Minimize' : 'Maximize'}
        height="1.4rem"
        width="1.4rem"
      />
    </MotionIconButton>
  );
}
