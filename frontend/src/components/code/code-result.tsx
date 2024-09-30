import type { SandpackFiles } from "@codesandbox/sandpack-react";
import { useAtomValue } from "jotai/react";
import { memo } from "react";
import type { CodeResponse } from "../../../bindings/github.com/etesam913/bytebook/index";
import { projectSettingsAtom } from "../../atoms";
import type { CodeBlockData } from "../../types";
import { TerminalComponent } from "../terminal";

export const CodeResult = memo(function CodeResult({
	nodeKey,
	data,
	writeDataToNode,
	language,
}: {
	nodeKey: string;
	data: CodeBlockData;
	writeDataToNode: (files: SandpackFiles, result: CodeResponse) => void;
	language: string;
}) {
	const { projectPath } = useAtomValue(projectSettingsAtom);

	return (
		// <div
		// 	onClick={(e) => e.stopPropagation()}
		// 	className={cn(
		// 		"bg-white border-[1px] border-[rgb(229,231,235)] dark:border-[rgb(37,37,37)] font-code hover:overflow-auto max-h-72 h-full w-full p-3 dark:text-zinc-100 text-sm dark:bg-[rgb(21,21,21)] overflow-hidden relative rounded-bl-[4px] rounded-br-[4px]",
		// 		!codeResult.success && "!text-red-500",
		// 	)}
		// >
		// 	<motion.button
		// 		className="absolute top-2 right-1.5 p-1 rounded-md"
		// 		{...getDefaultButtonVariants()}
		// 		onClick={async () => {
		// 			try {
		// 				navigator.clipboard.writeText(codeResult.message.slice(0, 3000));
		// 				toast.success(
		// 					"Copied code output to clipboard",
		// 					DEFAULT_SONNER_OPTIONS,
		// 				);
		// 			} catch {
		// 				toast.error(
		// 					"Failed to copy code output to clipboard",
		// 					DEFAULT_SONNER_OPTIONS,
		// 				);
		// 			}
		// 		}}
		// 		type="button"
		// 	>
		// 		<Duplicate2 />
		// 	</motion.button>

		// 	{codeResult.message.length > 0 ? (
		// 		<AnimatePresence mode="wait" initial={false}>
		// 			<motion.div
		// 				key={codeResult.id}
		// 				initial={{ y: -50, opacity: 0 }}
		// 				animate={{ y: 0, opacity: 1 }}
		// 				exit={{ y: 50, opacity: 0, transition: { duration: 0.15 } }}
		// 				className="whitespace-pre-wrap"
		// 			>
		// 				{codeResult.message.slice(0, 3000)}
		// 				{codeResult.message.length > 3000 && (
		// 					<div className="text-red-500">
		// 						Output truncated to 3000 characters
		// 					</div>
		// 				)}
		// 			</motion.div>
		// 		</AnimatePresence>
		// 	) : (
		// 		<div className="font-display text-md flex flex-col items-center gap-3 text-balance text-center">
		// 			<SquareCode width="2rem" height="2rem" />
		// 			<p>There's nothing printed from your code</p>
		// 		</div>
		// 	)}
		// </div>
		<div>
			<TerminalComponent
				nodeKey={nodeKey}
				data={data}
				shell="bash"
				isHeadless
				startDirectory={`${projectPath}/${language}/src`}
				writeDataToNode={(terminalResult) => {
					writeDataToNode(data.files, terminalResult);
				}}
			/>
		</div>
	);
});
