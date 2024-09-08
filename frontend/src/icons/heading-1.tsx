export function Heading1({
	fill = "currentColor",
	width = "1.25rem",
	height = "1.25rem",
	title = "heading 1",
}: {
	fill?: string;
	width?: string;
	height?: string;
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
					x1="2.75"
					x2="2.75"
					y1="4.75"
					y2="13.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="8.75"
					x2="8.75"
					y1="4.75"
					y2="13.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="2.75"
					x2="8.75"
					y1="9"
					y2="9"
				/>
				<path
					d="M14.75,13.25V4.75s-.974,1.713-3.04,2.108"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}
