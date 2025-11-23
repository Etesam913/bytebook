import { type ReactNode } from 'react';
import { getDefaultButtonVariants } from '../../animations';
import { MotionButton } from '../buttons';
import { cn } from '../../utils/string-formatting';

interface ErrorTextProps {
  message: string;
  onRetry: () => void;
  icon?: ReactNode;
  className?: string;
}

export function ErrorText({
  message,
  onRetry,
  icon,
  className = '',
}: ErrorTextProps) {
  return (
    <div
      className={cn(
        'text-center text-xs my-3 flex flex-col text-balance gap-2',
        className
      )}
    >
      <p className="text-red-500">{message}</p>
      <MotionButton
        {...getDefaultButtonVariants({
          disabled: false,
          whileHover: 1.025,
          whileTap: 0.975,
          whileFocus: 1.025,
        })}
        className="flex mx-auto"
        onClick={onRetry}
      >
        <span>Retry</span> {icon}
      </MotionButton>
    </div>
  );
}
