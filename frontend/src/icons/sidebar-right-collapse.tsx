export function SidebarRightCollapse({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	title = "WindowExpandTopLeft",
	className,
}: {
	width?: string;
	height?: string;
	fill?: string;
	secondaryfill?: string;
	title?: string;
	className?: string;
}) {
	return (
		<svg
			className={className}
			style={{ width, height }}
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
					x1="11.75"
					x2="11.75"
					y1="2.75"
					y2="15.25"
				/>
				<polyline
					fill="none"
					points="7.75 6.5 5.25 9 7.75 11.5"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
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
