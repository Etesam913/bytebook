export function MediaStop({
  width = '1.25rem',
  height = '1.25rem',
  fill = 'currentColor',
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
      style={{ width, height }}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fill={fill}>
        <rect
          height="12.5"
          width="12.5"
          fill="none"
          rx="2"
          ry="2"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x="2.75"
          y="2.75"
        />
      </g>
    </svg>
  );
}
