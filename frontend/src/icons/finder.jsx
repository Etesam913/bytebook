import React from "react";

function Finder(props) {
	const fill = props.fill || "currentColor";
	const secondaryfill = props.secondaryfill || fill;
	const strokewidth = props.strokewidth || 1;
	const width = props.width || "1em";
	const height = props.height || "1em";
	const title = props.title || "finder";

	return (
		<svg
			height={height}
			width={width}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M9.792,2.75c-1.854,3.5-1.792,7-1.792,7h2.021"
					fill="none"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokewidth}
				/>
				<path
					d="M12,11.947c-.883,.511-1.907,.803-3,.803s-2.118-.292-3-.803"
					fill="none"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokewidth}
				/>
				<line
					fill="none"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokewidth}
					x1="5.75"
					x2="5.75"
					y1="6.75"
					y2="7.75"
				/>
				<line
					fill="none"
					stroke={secondaryfill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokewidth}
					x1="12.25"
					x2="12.25"
					y1="6.75"
					y2="7.75"
				/>
				<rect
					height="12.5"
					width="12.5"
					fill="none"
					rx="2"
					ry="2"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={strokewidth}
					x="2.75"
					y="2.75"
				/>
			</g>
		</svg>
	);
}

export default Finder;
