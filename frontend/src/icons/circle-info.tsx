export function CircleInfo({
  width = '1.25rem',
  height = '1.25rem',
  fill = 'currentColor',
  secondaryfill = 'currentColor',
}: {
  width?: string;
  height?: string;
  fill?: string;
  secondaryfill?: string;
}) {
  return (
    <svg
      style={{ width, height }}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={secondaryfill} stroke={secondaryfill}>
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
        <line
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="9"
          x2="9"
          y1="12.75"
          y2="8.25"
        />
        <circle cx="9" cy="5.5" r="1" stroke="none" strokeWidth="0" />
      </g>
    </svg>
  );
}
