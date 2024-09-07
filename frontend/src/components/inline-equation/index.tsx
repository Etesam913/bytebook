import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { KatexRenderer } from "./katex-renderer";

export function InlineEquation({
	nodeKey,
	equation,
}: { nodeKey: string; equation: string }) {
	const [isSelected] = useLexicalNodeSelection(nodeKey);

	return (
		<span
			className={
				isSelected
					? "rounded-sm outline-2 outline outline-blue-300 dark:outline-blue-500 dark:border-blue-500"
					: ""
			}
		>
			<KatexRenderer equation={equation} />
		</span>
	);
}
