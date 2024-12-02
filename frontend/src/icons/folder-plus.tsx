export function FolderPlus({
	width = 1.25,
	height = 1.25,
	fill = "currentColor",
	title = "folder-plus",
	className = "",
}: {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
	className?: string;
}) {
	return (
		<svg
			style={{ width, height }}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<title>{title}</title>
			<g fill={fill} stroke={fill}>
				<path
					d="M2.25,8.75V4.75c0-1.105,.895-2,2-2h1.951c.607,0,1.18,.275,1.56,.748l.603,.752h5.386c1.105,0,2,.895,2,2v2.844"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M15.75,9.961v-1.211c0-1.104-.895-2-2-2H4.25c-1.105,0-2,.896-2,2v4.5c0,1.104,.895,2,2,2h5.55"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<line
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="14.75"
					x2="14.75"
					y1="12.25"
					y2="17.25"
				/>
				<line
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="17.25"
					x2="12.25"
					y1="14.75"
					y2="14.75"
				/>
			</g>
		</svg>
	);
}
