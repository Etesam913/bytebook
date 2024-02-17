export function XMark({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	secondaryfill = "currentColor",
	title = "x-icon",
}: {
	width?: string;
	height?: string;
	fill?: string;
	secondaryfill?: string;
	title?: string;
}) {
	return (
		<svg
			height={height}
			width={width}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={secondaryfill} stroke={secondaryfill}>
				<circle
					cx="9"
					cy="9"
					fill="none"
					r="7.25"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<line
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="6.25"
					x2="11.75"
					y1="6.25"
					y2="11.75"
				/>
				<line
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="11.75"
					x2="6.25"
					y1="6.25"
					y2="11.75"
				/>
			</g>
		</svg>
	);
}
