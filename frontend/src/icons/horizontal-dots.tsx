export function HorizontalDots({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	title = "Dots",
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
			<g fill="fill">
				<circle
					cx="9"
					cy="9"
					fill={fill}
					r=".5"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
				/>
				<circle
					cx="3.25"
					cy="9"
					fill={fill}
					r=".5"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
				/>
				<circle
					cx="14.75"
					cy="9"
					fill={fill}
					r=".5"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
				/>
			</g>
		</svg>
	);
}
