export function TagSlash({
  fill = 'currentColor',
  secondaryfill = fill,
  strokewidth = 1.5,
  width = 20,
  height = 20,
}: {
  fill?: string;
  secondaryfill?: string;
  strokewidth?: number;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <path
          d="M14.25,7.437l1.117,1.117c.781,.781,.781,2.047,0,2.828l-1.976,1.976-1.976,1.976c-.781,.781-2.047,.781-2.828,0l-1.117-1.117"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
        <path
          d="M5.625,12.375l-2.789-2.789c-.375-.375-.586-.884-.586-1.414V3.25c0-.552,.448-1,1-1h4.922c.53,0,1.039,.211,1.414,.586l2.789,2.789"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
        <circle
          cx="6.25"
          cy="6.25"
          fill={secondaryfill}
          r="1.25"
          stroke="none"
        />
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
          x1="2"
          x2="16"
          y1="16"
          y2="2"
        />
      </g>
    </svg>
  );
}

export default TagSlash;
