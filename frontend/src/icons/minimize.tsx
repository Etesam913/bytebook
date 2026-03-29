export function Minimize({
  width = '1.125rem',
  height = '1.125rem',
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  className,
}: {
  width?: string;
  height?: string;
  fill?: string;
  secondaryfill?: string;
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
          points="7.25 .75 7.25 4.75 11.25 4.75"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
        <polyline
          fill="none"
          points="4.75 11.25 4.75 7.25 .75 7.25"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </g>
    </svg>
  );
}
