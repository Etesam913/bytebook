export function CodePullRequest({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	secondaryfill = "currentColor",
	title = "code-merge",
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
				<path
					d="M14.25,12.25V5.75c0-1.105-.895-2-2-2h-3.5"
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M3.75,5.75v6.5c0,1.105,.895,2,2,2h3.5"
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<polyline
					fill="none"
					points="11 6 8.75 3.75 11 1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<polyline
					fill="none"
					points="7 12 9.25 14.25 7 16.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<circle
					cx="14.25"
					cy="14.25"
					fill="none"
					r="2"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<circle
					cx="3.75"
					cy="3.75"
					fill="none"
					r="2"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}
