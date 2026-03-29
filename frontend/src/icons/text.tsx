export function Text({
  fill = 'currentColor',
  width = '1.125rem',
  height = '1.125rem',
}: {
  fill?: string;
  width?: string;
  height?: string;
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
