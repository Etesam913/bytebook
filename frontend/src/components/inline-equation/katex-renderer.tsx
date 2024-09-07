import { useEffect, useRef } from "react";
import katex from "katex";

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

	return <span role="button" tabIndex={-1} ref={katexElementRef} />;
}
