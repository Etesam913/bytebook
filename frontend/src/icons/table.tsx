export function Table({
	fill = "currentColor",
	width = "1.25rem",
	height = "1.25rem",
	title = "Table",
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
			className={className}
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
					x2="16.25"
					y1="6.75"
					y2="6.75"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="1.75"
					x2="16.25"
					y1="11.25"
					y2="11.25"
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
					y2="15.25"
				/>
				<rect
					height="12.5"
					width="14.5"
					fill="none"
					rx="2"
					ry="2"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x="1.75"
					y="2.75"
				/>
			</g>
		</svg>
	);
}
