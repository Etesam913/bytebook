export function FolderXMark({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	title = "folder-x-mark",
}: {
	width?: string;
	height?: string;
	fill?: string;
	title?: string;
}) {
	return (
		<svg
			style={{ width, height }}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M2.25,8.75V4.75c0-1.105,.895-2,2-2h1.951c.607,0,1.18,.275,1.56,.748l.603,.752h5.386c1.105,0,2,.895,2,2v2.844"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M15.75,11.264v-2.514c0-1.104-.895-2-2-2H4.25c-1.105,0-2,.896-2,2v4.5c0,1.104,.895,2,2,2h7.465"
					fill="none"
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
					x2="17.25"
					y1="13.25"
					y2="17.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="17.25"
					x2="13.25"
					y1="13.25"
					y2="17.25"
				/>
			</g>
		</svg>
	);
}
