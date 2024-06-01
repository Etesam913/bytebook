import { motion } from "framer-motion";
import {
	type ButtonHTMLAttributes,
	type ForwardedRef,
	forwardRef,
} from "react";
import { cn } from "../../utils/string-formatting";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(props: ButtonProps, ref: ForwardedRef<HTMLButtonElement>) => {
		const { className, children, ...restOfProps } = props;

		return (
			<button
				ref={ref}
				className={cn(
					"bg-zinc-50 dark:bg-zinc-700 rounded-md text-left p-[6px] border-[1.25px] border-zinc-300 dark:border-zinc-600 flex gap-x-1.5 items-center disabled:bg-opacity-75 select-none will-change-transform",
					className,
				)}
				type="button"
				{...restOfProps}
			>
				{children}
			</button>
		);
	},
);

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(
	(props: ButtonProps, ref: ForwardedRef<HTMLButtonElement>) => {
		const { className, children, ...restOfProps } = props;

		return (
			<button
				ref={ref}
				className={cn(
					"transition-colors bg-transparent border-0 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform",
					className,
				)}
				type="button"
				{...restOfProps}
			>
				{children}
			</button>
		);
	},
);

// It's important to display a name for components using forwardRef for better debugging
Button.displayName = "Button";
IconButton.displayName = "IconButton";

export const MotionButton = motion(Button);
export const MotionIconButton = motion(IconButton);
