import { forwardRef } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes } from "react";
import { cn } from "../../utils/string-formatting";

interface InputProps {
	label?: string;
	labelProps: LabelHTMLAttributes<HTMLLabelElement>;
	inputProps: InputHTMLAttributes<HTMLInputElement>;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ label, labelProps, inputProps }, ref) => {
		const { className: inputClassName, ...restInputProps } = inputProps;
		const { className: labelClassName, ...restLabelProps } = labelProps;
		return (
			<>
				{label && (
					<label
						className={cn(
							"text-sm cursor-pointer pb-2 text-zinc-500 dark:text-zinc-300",
							labelClassName,
						)}
						{...restLabelProps}
					>
						{label}
					</label>
				)}
				<input
					ref={ref}
					maxLength={75}
					className={cn(
						"bg-zinc-150 dark:bg-zinc-700 py-1 px-2 rounded-md outline outline-offset-0 outline-2 focus-visible:outline-blue-400 dark:focus-visible:outline-blue-500 outline-zinc-300 dark:outline-zinc-600",
						inputClassName,
					)}
					{...restInputProps}
				/>
			</>
		);
	},
);
