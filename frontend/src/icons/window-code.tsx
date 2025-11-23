function WindowCode({
  fill = 'currentColor',
  secondaryfill,
  strokewidth = 1.5,
  width = 18,
  height = 18,
}: {
  fill?: string;
  secondaryfill?: string;
  strokewidth?: number;
  width?: number;
  height?: number;
}) {
  secondaryfill = secondaryfill || fill;

  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <rect
          height="12.5"
          width="14.5"
          fill="none"
          rx="2"
          ry="2"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
          transform="translate(18 18) rotate(180)"
          x="1.75"
          y="2.75"
        />
        <circle
          cx="4.25"
          cy="5.25"
          fill={secondaryfill}
          r=".75"
          stroke="none"
        />
        <circle
          cx="6.75"
          cy="5.25"
          fill={secondaryfill}
          r=".75"
          stroke="none"
        />
        <polyline
          fill="none"
          points="10.75 12.25 13 10 10.75 7.75"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
        <polyline
          fill="none"
          points="7.25 12.25 5 10 7.25 7.75"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
      </g>
    </svg>
  );
}

export default WindowCode;
