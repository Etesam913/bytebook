export function ExitFullscreen({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	title = "Exit Fullscreen",
}: {
	width?: string;
	height?: string;
	fill?: string;
	title?: string;
	className?: string;
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
				<polyline
					fill="none"
					points="15.25 7.25 10.75 7.25 10.75 2.75"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<polyline
					fill="none"
					points="7.25 15.25 7.25 10.75 2.75 10.75"
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
					x1="10.75"
					x2="15.25"
					y1="7.25"
					y2="2.75"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="7.25"
					x2="2.75"
					y1="10.75"
					y2="15.25"
				/>
			</g>
		</svg>
	);
}
