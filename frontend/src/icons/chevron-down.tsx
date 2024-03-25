export function ChevronDown({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	title = "Down",
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
				<polyline
					fill="none"
					points="15.25 6.5 9 12.75 2.75 6.5"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				//{" "}
			</g>
		</svg>
	);
}
