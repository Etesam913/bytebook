function LabelPlus({
	width = 20,
	height = 20,
	fill = "currentColor",
	title = "Add Tag",
	className,
}: {
	width?: number;
	height?: number;
	fill?: string;
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
				<path
					d="M11.96,16.25H5.75c-1.105,0-2-.895-2-2V7.388c0-.565,.239-1.104,.658-1.483l3.921-3.547c.381-.345,.961-.345,1.342,0l3.921,3.547c.419,.379,.658,.918,.658,1.483v.362"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<circle cx="9" cy="6.75" fill={fill} r="1.25" stroke="none" />
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="14.25"
					x2="14.25"
					y1="10.25"
					y2="15.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="16.75"
					x2="11.75"
					y1="12.75"
					y2="12.75"
				/>
			</g>
		</svg>
	);
}

export default LabelPlus;
