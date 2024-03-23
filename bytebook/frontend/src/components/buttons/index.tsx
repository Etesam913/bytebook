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
				ref={ref} // Forward the ref here
				className={cn(
					"bg-zinc-50 dark:bg-zinc-700 rounded-md text-left p-[6px] border-[1.25px] border-zinc-300 dark:border-zinc-600 flex items-center disabled:bg-opacity-75",
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

export const MotionButton = motion(Button);
