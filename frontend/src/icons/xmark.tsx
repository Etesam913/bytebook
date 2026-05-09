export function Xmark({
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
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="2.25"
          x2="9.75"
          y1="9.75"
          y2="2.25"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="9.75"
          x2="2.25"
          y1="9.75"
          y2="2.25"
        />
      </g>
    </svg>
  );
}
