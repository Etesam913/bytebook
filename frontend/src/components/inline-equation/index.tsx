import { KatexRenderer } from "./katex-renderer";

export function InlineEquation({ equation }: { equation: string }) {
	return <KatexRenderer equation={equation} />;
}
