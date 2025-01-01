import { TriangleWarning } from "../../icons/triangle-warning";

export function ErrorLoading() {
	return (
		<div className="text-center text-sm h-full flex flex-col items-center justify-center gap-1">
			<TriangleWarning
				width={32}
				height={32}
				className="pointer-events-none mb-1"
			/>
			<h3 className="pointer-events-none">Error: Could not load file</h3>
		</div>
	);
}
