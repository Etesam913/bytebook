export function ReturnKey({
  fill = 'currentColor',
  strokewidth = '1.5',
  width = 16,
  height = 16,
}: {
  fill?: string;
  strokewidth?: string;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <path
          d="m1.25,6.75h8.5c.5523,0,1-.4477,1-1v-2.5c0-.5523-.4477-1-1-1h-1.75"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
        <polyline
          fill="none"
          points="3.75 4 1 6.75 3.75 9.5"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
      </g>
    </svg>
  );
}
