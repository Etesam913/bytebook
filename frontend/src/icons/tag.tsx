export function TagIcon({
	width = 20,
	height = 20,
	fill = "currentColor",
	title = "Tag",
	className,
	strokeWidth = 1.5,
}: {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
	className?: string;
	strokeWidth?: number;
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
					d="M3.25,2.25h4.922c.53,0,1.039,.211,1.414,.586l5.75,5.75c.781,.781,.781,2.047,0,2.828l-3.922,3.922c-.781,.781-2.047,.781-2.828,0L2.836,9.586c-.375-.375-.586-.884-.586-1.414V3.25c0-.552,.448-1,1-1Z"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokeWidth}
				/>
				<circle cx="6.25" cy="6.25" fill={fill} r="1.25" stroke="none" />
			</g>
		</svg>
	);
}
