export function Text({
  fill = 'currentColor',
  width = 18,
  height = 18,
}: {
  fill?: string;
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
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="6"
          x2="6"
          y1="1.25"
          y2="10.75"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="10"
          x2="2"
          y1="1.25"
          y2="1.25"
        />
      </g>
    </svg>
  );
}
