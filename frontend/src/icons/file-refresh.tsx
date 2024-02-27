export function FileRefresh({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	secondaryfill = "currentColor",
	title = "File Refresh",
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
			style={{ height, width }}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={secondaryfill} stroke={secondaryfill}>
				<line
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="5.75"
					x2="7.75"
					y1="6.75"
					y2="6.75"
				/>
				<line
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="5.75"
					x2="10.25"
					y1="9.75"
					y2="9.75"
				/>
				<path
					d="M15.16,6.25h-3.41c-.552,0-1-.448-1-1V1.852"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M15.25,9.319v-2.655c0-.265-.105-.52-.293-.707l-3.914-3.914c-.188-.188-.442-.293-.707-.293H4.75c-1.105,0-2,.896-2,2V14.25c0,1.104,.895,2,2,2h4.823"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M16.5,16.387c-.501,.531-1.212,.863-2,.863-1.519,0-2.75-1.231-2.75-2.75s1.231-2.75,2.75-2.75c1.166,0,2.162,.726,2.563,1.75"
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<polyline
					fill="none"
					points="14.75 13.75 17.25 13.75 17.25 11.25"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}

// function Trash2(props) {
// 	const fill = props.fill || 'currentColor';
// 	const secondaryfill = props.secondaryfill || fill;
// 	const width = props.width || '100%';
// 	const height = props.height || '100%';
// 	const title = props.title || "trash 2";

// 	return (
// 		<svg height={height} width={width} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
// 	<title>{title}</title>
// 	<g fill={secondaryfill} stroke={secondaryfill}>
// 		<line fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="2.75" x2="15.25" y1="4.25" y2="4.25"/>
// 		<line fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="7.25" x2="7.25" y1="8.75" y2="13.25"/>
// 		<line fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" x1="10.75" x2="10.75" y1="8.75" y2="13.25"/>
// 		<path d="M6.75,4.25v-1.5c0-.552,.448-1,1-1h2.5c.552,0,1,.448,1,1v1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
// 		<path d="M13.75,6.75v7.5c0,1.105-.895,2-2,2H6.25c-1.105,0-2-.895-2-2V6.75" fill="none" stroke={fill} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
// 	</g>
// </svg>
// 	);
// };

// import React from 'react';

// function FileRefresh(props) {
// 	const fill = props.fill || 'currentColor';
// 	const secondaryfill = props.secondaryfill || fill;
// 	const width = props.width || '100%';
// 	const height = props.height || '100%';
// 	const title = props.title || "file refresh";

// 	return (

// 	);
// };

// export default FileRefresh;
