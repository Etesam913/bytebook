export function MarkdownIcon({
	width = "1.25rem",
	height = "1.25rem",
	title = "markdown",
	fill = "currentColor",
	className,
}: {
	width?: string;
	height?: string;
	title?: string;
	fill?: string;
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
				<rect
					height="10.5"
					width="16.5"
					fill="none"
					rx="2"
					ry="2"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x=".75"
					y="3.75"
				/>
				<polyline
					fill="none"
					points="8.75 11.25 8.75 6.75 8.356 6.75 6.25 9.5 4.144 6.75 3.75 6.75 3.75 11.25"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<polyline
					fill="none"
					points="11.5 9.5 13.25 11.25 15 9.5"
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
					x1="13.25"
					x2="13.25"
					y1="11.25"
					y2="6.75"
				/>
			</g>
		</svg>
	);
}
