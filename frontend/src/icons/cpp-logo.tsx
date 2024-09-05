export function CppLogo({
	width = "1.25rem",
	height = "1.25rem",
	title = "cpp logo",
}: {
	width?: string;
	height?: string;
	title?: string;
}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<title>{title}</title>
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M18 12h4" />
			<path d="M20 10v4" />
			<path d="M11 12h4" />
			<path d="M13 10v4" />
			<path d="M9 9a3 3 0 0 0 -3 -3h-.5a3.5 3.5 0 0 0 -3.5 3.5v5a3.5 3.5 0 0 0 3.5 3.5h.5a3 3 0 0 0 3 -3" />
		</svg>
	);
}
