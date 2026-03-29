function PowerOff({
  fill = 'currentColor',
  secondaryfill,
  strokewidth = 1.5,
  width = '1rem',
  height = '1rem',
}: {
  strokeWidth?: number;
  width?: string;
  height?: string;
  fill?: string;
  secondaryfill?: string;
  strokewidth?: number;
}) {
  secondaryfill = secondaryfill || fill;

  return (
    <svg
      style={{ width, height }}
      strokeWidth={strokewidth}
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <path
          d="m9.4,2c1.132.963,1.85,2.398,1.85,4,0,2.899-2.351,5.25-5.25,5.25S.75,8.899.75,6c0-1.602.718-3.037,1.85-4"
          fill="none"
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
          x1="6"
          x2="6"
          y1=".75"
          y2="6"
        />
      </g>
    </svg>
  );
}

export default PowerOff;
