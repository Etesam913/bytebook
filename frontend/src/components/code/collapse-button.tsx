import { motion } from 'motion/react';
import { getDefaultButtonVariants } from '../../animations';
import { ChevronDown } from '../../icons/chevron-down';
import { MotionIconButton } from '../buttons';

export function CollapseButton({
  isCollapsed,
  setIsCollapsed,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (newIsCollapsed: boolean) => void;
}) {
  return (
    <MotionIconButton
      onClick={() => setIsCollapsed(!isCollapsed)}
      {...getDefaultButtonVariants()}
    >
      <motion.div
        initial={{ rotateZ: !isCollapsed ? 180 : 0 }}
        animate={{ rotateZ: !isCollapsed ? 180 : 0 }}
      >
        <ChevronDown className="will-change-transform" strokeWidth="2.5px" />
      </motion.div>
    </MotionIconButton>
  );
}
