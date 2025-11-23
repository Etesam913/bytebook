export function SquareTerminal({
  width = 16,
  height = 16,
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
      className={className}
      style={{ width, height }}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <rect
          x="2.75"
          y="2.75"
          width="12.5"
          height="12.5"
          rx="2"
          ry="2"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <line
          x1="9.75"
          y1="12.25"
          x2="12.25"
          y2="12.25"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <polyline
          points="5.75 12.25 8.25 9.75 5.75 7.25"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
