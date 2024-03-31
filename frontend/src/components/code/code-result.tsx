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
				"bg-zinc-150 font-code max-h-72 w-full overflow-auto rounded-md px-3 py-2 text-sm dark:bg-zinc-900",
				!codeResult.success && "text-red-500",
			)}
		>
			{codeResult.message.length > 0 ? (
				<div>
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
