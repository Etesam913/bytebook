export function SortNumAscending({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	title = "sort num ascending",
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
				<polyline
					fill="none"
					points="10.5 6.25 13.25 3.5 16 6.25"
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
					x1="13.25"
					x2="13.25"
					y1="3.5"
					y2="14"
				/>
				<path
					d="M5.25,7.5V2s-.63,1.108-1.967,1.364"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M4.5,15.5c.351-.169,.973-.53,1.484-1.226,.82-1.114,.789-2.316,.766-2.681"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<circle
					cx="5.156"
					cy="11.594"
					fill="none"
					r="1.594"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}
