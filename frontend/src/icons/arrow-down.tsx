export function ArrowDown({
  width = 20,
  height = 20,
  fill = 'currentColor',
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <svg
      height={height}
      width={width}
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
