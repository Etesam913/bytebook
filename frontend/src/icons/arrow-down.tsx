export function ArrowDown({
  width = '1.25rem',
  height = '1.25rem',
  fill = 'currentColor',
  className,
}: {
  width?: string;
  height?: string;
  fill?: string;
  className?: string;
}) {
  return (
    <svg
      style={{ width, height }}
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fill={fill}>
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          x1="10"
          x2="10"
          y1="3"
          y2="17"
        />
        <polyline
          fill="none"
          points="5 12 10 17 15 12"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
