function HourglassStart({
	width = 20,
	height = 20,
	fill = "currentColor",
	title = "Hourglass",
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
			height={height}
			width={width}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M4.75,15.75c0-3.86,.557-5.456,2.46-6.75-1.903-1.294-2.46-2.89-2.46-6.75"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M13.25,15.75c0-3.86-.557-5.456-2.46-6.75,1.903-1.294,2.46-2.89,2.46-6.75"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M9,7.494c-.741,0-1.79-.529-2.109-2.923-.024-.167,.022-.289,.117-.398,.095-.11,.233-.173,.378-.173h3.229c.145,0,.283,.062,.378,.173,.095,.109,.141,.231,.117,.398-.319,2.394-1.368,2.923-2.109,2.923Z"
					fill={fill}
					stroke="none"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="3.75"
					x2="14.25"
					y1="2.25"
					y2="2.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="3.75"
					x2="14.25"
					y1="15.75"
					y2="15.75"
				/>
			</g>
		</svg>
	);
}

export default HourglassStart;
