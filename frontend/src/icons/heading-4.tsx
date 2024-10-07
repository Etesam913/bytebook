export function Heading4({
	fill = "currentColor",
	width = 20,
	height = 20,
	title = "heading 4",
}: {
	fill?: string;
	width?: number;
	height?: number;
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
			<g fill={fill}>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="1.75"
					x2="1.75"
					y1="4.75"
					y2="13.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="7.75"
					x2="7.75"
					y1="4.75"
					y2="13.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="1.75"
					x2="7.75"
					y1="9"
					y2="9"
				/>
				<polyline
					fill="none"
					points="16.691 10.75 10.25 10.75 10.25 10.641 15 4.75 15 13.25"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}
