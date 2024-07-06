export function OpenRectArrowIn({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	secondaryfill = "currentColor",
	title = "arrow-in",
	className,
}: {
	classname?: string;
	width?: string;
	height?: string;
	fill?: string;
	secondaryfill?: string;
	title?: string;
	className?: string;
}) {
	return (
		<svg
			height={height}
			width={width}
			className={className}
			viewBox="0 0 12 12"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<line
					fill="none"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="6.75"
					x2=".75"
					y1="6"
					y2="6"
				/>
				<polyline
					fill="none"
					points="4.5 8.5 7 6 4.5 3.5"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="m6.75,11.25h2.5c1.105,0,2-.895,2-2V2.75c0-1.105-.895-2-2-2h-2.5"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}

export default OpenRectArrowIn;
