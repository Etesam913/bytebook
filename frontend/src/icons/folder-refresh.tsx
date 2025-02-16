export function FolderRefresh({
	width = 20,
	height = 20,
	fill = "currentColor",
	secondaryfill = fill,
	strokewidth = 1.5,
	title = "folder refresh",
	className = "",
}: {
	width?: number;
	height?: number;
	fill?: string;
	secondaryfill?: string;
	strokewidth?: number;
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
			<g fill={fill}>
				<path
					d="M2.25,8.75V4.75c0-1.105,.895-2,2-2h1.951c.607,0,1.18,.275,1.56,.748l.603,.752h5.386c1.105,0,2,.895,2,2v2.5"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokewidth}
				/>
				<path
					d="M15.75,9.273v-.523c0-1.104-.895-2-2-2H4.25c-1.105,0-2,.896-2,2v4.5c0,1.104,.895,2,2,2h5.076"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokewidth}
				/>
				<path
					d="M16.5,16.387c-.501,.531-1.212,.863-2,.863-1.519,0-2.75-1.231-2.75-2.75s1.231-2.75,2.75-2.75c1.166,0,2.162,.726,2.563,1.75"
					fill="none"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokewidth}
				/>
				<polyline
					fill="none"
					points="14.75 13.75 17.25 13.75 17.25 11.25"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokewidth}
				/>
			</g>
		</svg>
	);
}
