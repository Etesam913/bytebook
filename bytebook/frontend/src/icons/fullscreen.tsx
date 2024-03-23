export function Fullscreen({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	secondaryfill = "currentColor",
	title = "Fullscreen",
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
			style={{ width, height }}
			className={className}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<rect
					height="1.5"
					width="17.678"
					fill={secondaryfill}
					transform="translate(-3.728 9) rotate(-45)"
					x=".161"
					y="8.25"
				/>
				<path
					d="M15.25,8c-.414,0-.75-.336-.75-.75V3.5h-3.75c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75h4.5c.414,0,.75,.336,.75,.75V7.25c0,.414-.336,.75-.75,.75Z"
					fill={fill}
				/>
				<path
					d="M7.25,16H2.75c-.414,0-.75-.336-.75-.75v-4.5c0-.414,.336-.75,.75-.75s.75,.336,.75,.75v3.75h3.75c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75Z"
					fill={fill}
				/>
			</g>
		</svg>
	);
}
