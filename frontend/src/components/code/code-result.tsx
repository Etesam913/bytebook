import { memo } from "react";
import { SquareCode } from "../../icons/square-code";
import { cn } from "../../utils/string-formatting";

export const CodeResult = memo(function CodeResult({
	codeResult,
}: {
	codeResult: { message: string; success: boolean } | undefined;
}) {
	if (!codeResult) return <></>;
	return (
		<div
			onClick={(e) => e.stopPropagation()}
			className={cn(
				"bg-white border-[1px] my-1 border-[rgb(229,231,235)] dark:border-none font-code max-h-72 w-full overflow-auto p-3 dark:text-zinc-100 text-sm dark:bg-[rgb(21,21,21)]",
				!codeResult.success && "!text-red-500",
			)}
		>
			{codeResult.message.length > 0 ? (
				<div className="whitespace-pre-wrap">
					{codeResult.message.slice(0, 3000)}
					{codeResult.message.length > 3000 && (
						<div className="text-red-500">
							Output truncated to 3000 characters
						</div>
					)}
				</div>
			) : (
				<div className="font-display text-md flex flex-col items-center gap-3 text-balance text-center">
					<SquareCode width="2rem" height="2rem" />
					<p>There's nothing printed from your code</p>
				</div>
			)}
		</div>
	);
});
