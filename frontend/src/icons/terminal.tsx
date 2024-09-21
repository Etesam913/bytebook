export function TerminalIcon({
	fill = "currentColor",
	width = "1.25rem",
	height = "1.25rem",
	title = "terminal",
	className,
}: {
	fill?: string;
	width?: string;
	height?: string;
	title?: string;
	className?: string;
}) {
	return (
		<svg
			height={height}
			width={width}
			className={className}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<polyline
					fill="none"
					points="2.75 14.25 8 9 2.75 3.75"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="9.5"
					x2="15.25"
					y1="14.25"
					y2="14.25"
				/>
			</g>
		</svg>
	);
}
