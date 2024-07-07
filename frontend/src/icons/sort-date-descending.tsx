export function SortDateDescending({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	title = "sort date descending",
	className,
}: {
	width?: string;
	height?: string;
	fill?: string;
	title?: string;
	className?: string;
}) {
	return (
		<svg
			style={{ width, height }}
			className={className}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M8.25,15.25H4.25c-1.105,0-2-.895-2-2V4.75c0-1.105,.895-2,2-2H13.75c1.105,0,2,.895,2,2v4.5"
					fill="none"
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
					x1="5.75"
					x2="5.75"
					y1="2.75"
					y2=".75"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="12.25"
					x2="12.25"
					y1="2.75"
					y2=".75"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="2.25"
					x2="15.75"
					y1="6.25"
					y2="6.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="13.25"
					x2="13.25"
					y1="16.25"
					y2="10.75"
				/>
				<polyline
					fill="none"
					points="15.75 13.75 13.25 16.25 10.75 13.75"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}
