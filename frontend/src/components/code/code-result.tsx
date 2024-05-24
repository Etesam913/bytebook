import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";
import { SquareCode } from "../../icons/square-code";

import type { CodeResponse } from "../../../bindings/main/models";
import { easingFunctions } from "../../animations";
import { cn } from "../../utils/string-formatting";

export const CodeResult = memo(function CodeResult({
	codeResult,
}: {
	codeResult: CodeResponse;
}) {
	console.log(codeResult.id);
	return (
		<div
			onClick={(e) => e.stopPropagation()}
			className={cn(
				"bg-white border-[1px] border-[rgb(229,231,235)] dark:border-none font-code max-h-72 w-full p-3 dark:text-zinc-100 text-sm dark:bg-[rgb(21,21,21)] overflow-hidden relative",
				!codeResult.success && "!text-red-500",
			)}
		>
			{codeResult.message.length > 0 ? (
				<AnimatePresence mode="popLayout" initial={false}>
					<motion.div
						key={codeResult.id}
						initial={{ y: -50, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 50, opacity: 0 }}
						className="whitespace-pre-wrap"
					>
						{codeResult.message.slice(0, 3000)}
						{codeResult.message.length > 3000 && (
							<div className="text-red-500">
								Output truncated to 3000 characters
							</div>
						)}
					</motion.div>
				</AnimatePresence>
			) : (
				<div className="font-display text-md flex flex-col items-center gap-3 text-balance text-center">
					<SquareCode width="2rem" height="2rem" />
					<p>There's nothing printed from your code</p>
				</div>
			)}
		</div>
	);
});
