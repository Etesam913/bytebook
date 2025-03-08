export function Text({
  fill = 'currentColor',
  width = '0.9rem',
  height = '0.9rem',
  title = 'Text',
}: {
  fill?: string;
  width?: string;
  height?: string;
  title?: string;
}) {
  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
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
