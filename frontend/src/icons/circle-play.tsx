// import React from 'react';

// function CirclePlay(props) {
// 	const strokewidth = props.strokewidth || 1;
// 	const width = props.width || '100%';
// 	const height = props.height || '100%';
// 	const title = props.title || "circle play";

// 	return (
// 		<svg height={height} width={width} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
// 	<title>{title}</title>
// 	<g fill="#F7F7F7">
// 		<path d="M11.652,8.568l-3.651-2.129c-.333-.194-.752,.046-.752,.432v4.259c0,.386,.419,.626,.752,.432l3.651-2.129c.331-.193,.331-.671,0-.864Z" fill="none" stroke="#F7F7F7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokewidth}/>
// 		<circle cx="9" cy="9" fill="none" r="7.25" stroke="#F7F7F7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokewidth}/>
// 	</g>
// </svg>
// 	);
// };

// export default CirclePlay;

export function Play({
	width = "1.4rem",
	height = "1.4rem",
	fill = "currentColor",
	secondaryfill = "currentColor",
	title = "Play",
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
				<path
					d="M11.652,8.568l-3.651-2.129c-.333-.194-.752,.046-.752,.432v4.259c0,.386,.419,.626,.752,.432l3.651-2.129c.331-.193,.331-.671,0-.864Z"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<circle
					cx="9"
					cy="9"
					fill="none"
					r="7.25"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
			</g>
		</svg>
	);
}
