import { memo } from "react";
import { SquareCode } from "../../icons/square-code";
import { cn } from "../../utils/string-formatting";

export const CodeResult = memo(function CodeResult({
	codeResult,
}: { codeResult: { message: string; success: boolean } | undefined }) {
	if (!codeResult) return <></>;

	return (
		<div
			className={cn(
				"w-full overflow-auto max-h-72 dark:bg-zinc-900 bg-zinc-150 px-3 py-2 rounded-md font-code text-sm",
				!codeResult.success && "text-red-500",
			)}
		>
			<div>rerendered {Math.random()}</div>
			{codeResult.message.length > 0 ? (
				<div>{codeResult.message}</div>
			) : (
				<div className="flex flex-col items-center gap-3 font-display text-md text-balance text-center">
					<SquareCode width="2rem" height="2rem" />
					<p>There's nothing printed from your code</p>
				</div>
			)}
		</div>
	);
});
