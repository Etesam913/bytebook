import React from "react";

function ListCheckbox2(props) {
	const fill = props.fill || "currentColor";
	const secondaryfill = props.secondaryfill || fill;
	const width = props.width || "100%";
	const height = props.height || "100%";
	const title = props.title || "list checkbox 2";

	return (
		<svg
			height={height}
			width={width}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<polyline
					fill="none"
					points="2.25 13.391 3.609 14.75 7.006 10.333"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<polyline
					fill="none"
					points="2.25 5.891 3.609 7.25 7.006 2.833"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<line
					fill="none"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="9.75"
					x2="16.25"
					y1="5.25"
					y2="5.25"
				/>
				<line
					fill="none"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="9.75"
					x2="16.25"
					y1="12.75"
					y2="12.75"
				/>
			</g>
		</svg>
	);
}

export default ListCheckbox2;
