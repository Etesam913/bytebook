export function CodeMerge({
	width = 18,
	height = 18,
	fill = "currentColor",
	strokeWidth = 1.5,
	title = "code merge",
	className = "",
}: {
	width?: number;
	height?: number;
	fill?: string;
	strokeWidth?: number;
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
					strokeWidth={strokeWidth}
					x1="4.75"
					x2="4.75"
					y1="6.25"
					y2="16.25"
				/>
				<path
					d="M11,12.5c-3.452,0-6.25-2.798-6.25-6.25"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokeWidth}
				/>
				<circle
					cx="4.75"
					cy="4"
					fill="none"
					r="2.25"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokeWidth}
				/>
				<circle
					cx="13.25"
					cy="12.5"
					fill="none"
					r="2.25"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokeWidth}
				/>
			</g>
		</svg>
	);
}
