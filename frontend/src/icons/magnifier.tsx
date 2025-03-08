export function Magnifier({
  width = 20,
  height = 20,
  fill = 'currentColor',
  title = 'search',
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;

  title?: string;
  className?: string;
}) {
  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>{title}</title>
      <g fill={fill}>
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="7.652"
          x2="10.75"
          y1="7.652"
          y2="10.75"
        />
        <circle
          cx="5"
          cy="5"
          fill="none"
          r="3.75"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
