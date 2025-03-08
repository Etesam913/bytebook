export function Compose({
  width = 20,
  height = 20,
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  title = 'compose',
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;
  secondaryfill?: string;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      style={{ height, width }}
      className={className}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g fill={secondaryfill} stroke={secondaryfill}>
        <path
          d="M15.25,10.5v2.75c0,1.105-.895,2-2,2H4.75c-1.105,0-2-.895-2-2V4.75c0-1.105,.895-2,2-2h3"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M14.429,6.535c-.352,2.737-2.611,3.227-5.01,2.906"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M6.25,11.75S7.3,2.533,16.25,1.75c-.448,.781-.459,2.084-.757,3.392-.419,1.608-1.868,1.808-3.643,1.808"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}

// import React from 'react';

// function Compose3(props) {
// 	const fill = props.fill || 'currentColor';
// 	const secondaryfill = props.secondaryfill || fill;
// 	const width = props.width || '100%';
// 	const height = props.height || '100%';
// 	const title = props.title || "compose 3";

// 	return (

// 	);
// };

// export default Compose3;
