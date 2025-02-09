import katex from "katex";
import { useEffect, useRef } from "react";

export function KatexRenderer({ equation }: { equation: string }) {
	const katexElementRef = useRef(null);
	useEffect(() => {
		const katexElement = katexElementRef.current;

		if (katexElement !== null) {
			katex.render(equation, katexElement, {
				displayMode: false,
				errorColor: "#cc0000",
				output: "html",
				strict: "warn",
				throwOnError: false,
				trust: false,
			});
		}
	}, [equation]);
	// pointer-events-none is needed to let the parent span handle the click event
	return (
		<span
			role="button"
			data-katex="true"
			tabIndex={-1}
			ref={katexElementRef}
			className="pointer-events-none"
		/>
	);
}
