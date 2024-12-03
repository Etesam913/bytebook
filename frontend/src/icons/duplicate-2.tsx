export function Duplicate2({
	width = 20,
	height = 20,
	fill = "currentColor",
	secondaryfill = "currentColor",
	title = "duplicate",
	className,
}: {
	width?: number;
	height?: number;
	fill?: string;
	secondaryfill?: string;
	title?: string;
	className?: string;
}) {
	return (
		<svg
			height={height}
			width={width}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<title>{title}</title>
			<g fill={fill}>
				<rect
					height="11"
					width="11"
					fill="none"
					rx="2"
					ry="2"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					transform="translate(14.5 14.5) rotate(-180)"
					x="1.75"
					y="1.75"
				/>
				<path
					d="M15.199,6.002l1.029,6.924c.162,1.093-.592,2.11-1.684,2.272l-6.924,1.029c-.933,.139-1.81-.39-2.148-1.228"
					fill="none"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}
