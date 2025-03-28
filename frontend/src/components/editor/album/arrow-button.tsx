import { motion } from 'motion/react';
import { getDefaultButtonVariants } from '../../../animations';
import { CircleArrowLeft } from '../../../icons/circle-arrow-left';
import { CircleArrowRight } from '../../../icons/circle-arrow-right';
import { cn } from '../../../utils/string-formatting';
import { Dispatch, SetStateAction } from 'react';

export function ArrowButton({
  direction,
  shouldUseMouseActivity,
  setShouldUseMouseActivity,
  onClick,
}: {
  nodeKey: string;
  direction: 'left' | 'right';
  shouldUseMouseActivity: boolean;
  setShouldUseMouseActivity: Dispatch<SetStateAction<boolean>>;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{
        opacity: shouldUseMouseActivity ? 1 : 0,
      }}
      onFocus={() => setShouldUseMouseActivity(true)}
      transition={{ duration: 0.2 }}
      {...getDefaultButtonVariants()}
      onClick={onClick}
      className={cn(
        'fixed z-50 bottom-11 bg-[rgba(0,0,0,0.55)] text-white p-1 rounded-full',
        direction === 'left' ? 'left-[40%]' : 'right-[40%]'
      )}
      type="submit"
    >
      {direction === 'left' ? (
        <CircleArrowLeft width={28} height={28} />
      ) : (
        <CircleArrowRight width={28} height={28} />
      )}
    </motion.button>
  );
}
