export function Play({
	width = 20,
	height = 20,
	fill = "currentColor",
	title = "Play",
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
			className={className}
			style={{ width, height }}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M11.652,8.568l-3.651-2.129c-.333-.194-.752,.046-.752,.432v4.259c0,.386,.419,.626,.752,.432l3.651-2.129c.331-.193,.331-.671,0-.864Z"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<circle
					cx="9"
					cy="9"
					fill="none"
					r="7.25"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}
