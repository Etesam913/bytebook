import React from "react";

function UnorderedList(props) {
	const fill = props.fill || "currentColor";
	const secondaryfill = props.secondaryfill || fill;
	const width = props.width || "100%";
	const height = props.height || "100%";
	const title = props.title || "unordered list";

	return (
		<svg
			height={height}
			width={width}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<circle
					cx="3.75"
					cy="5.25"
					fill="none"
					r="2"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<circle
					cx="3.75"
					cy="12.75"
					fill="none"
					r="2"
					stroke={secondaryfill}
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
					x1="8.75"
					x2="16.25"
					y1="5.25"
					y2="5.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="8.75"
					x2="16.25"
					y1="12.75"
					y2="12.75"
				/>
			</g>
		</svg>
	);
}

export default UnorderedList;
