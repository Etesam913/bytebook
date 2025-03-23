import { ChangeEventHandler } from 'react';
import { cn } from '../../utils/string-formatting';
import { motion } from 'motion/react';

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
}) {
  // eslint-disable-next-line react-compiler/react-compiler
  'use no memo';
  return (
    <div className="flex items-center gap-2">
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          style={{ justifyContent: checked ? 'flex-end' : 'flex-start' }}
          className={cn(
            'flex items-center w-11 h-6 rounded-full transition-colors duration-200 ease-in-out px-1',
            checked ? 'bg-(--accent-color)' : 'bg-gray-200 dark:bg-gray-600'
          )}
        >
          <motion.div
            layout
            transition={{ type: 'spring', visualDuration: 0.2, bounce: 0.35 }}
            className="bg-white w-4 h-4 rounded-full"
          />
        </div>
        <span className="ml-2 text-sm font-medium">
          {checked ? 'On' : 'Off'}
        </span>
      </label>
    </div>
  );
}
