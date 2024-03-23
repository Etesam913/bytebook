// function ChevronDown(props) {
// 	const strokewidth = props.strokewidth || 1;
// 	const width = props.width || '100%';
// 	const height = props.height || '100%';
// 	const title = props.title || "chevron down";

// 	return (
// 		<svg height={height} width={width} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
// 	<title>{title}</title>
// 	<g fill="#F7F7F7">
// 		<polyline fill="none" points="15.25 6.5 9 12.75 2.75 6.5" stroke="#F7F7F7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokewidth}/>
// 	</g>
// </svg>
// 	);
// };

// export default ChevronDown;

export function ChevronDown({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	secondaryfill = "currentColor",
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
