export function Maximize({
  width = '1.125rem',
  height = '1.125rem',
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  strokeWidth = 1.25,
  className,
}: {
  width?: string;
  height?: string;
  fill?: string;
  secondaryfill?: string;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      style={{ width, height }}
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <polyline
          fill="none"
          points="10.25 5.75 10.25 1.75 6.25 1.75"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <polyline
          fill="none"
          points="1.75 6.25 1.75 10.25 5.75 10.25"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  );
}
