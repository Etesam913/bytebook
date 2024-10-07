export function Heading6({
	fill = "currentColor",
	width = 20,
	height = 20,
	title = "heading 6",
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
				<path
					d="M16.101,5.232c-1.44-.828-3.554-.624-4.539,.883-.882,1.35-1.074,3.683-.435,5.32"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<ellipse
					cx="13.853"
					cy="10.5"
					fill="none"
					rx="2.897"
					ry="2.75"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}
