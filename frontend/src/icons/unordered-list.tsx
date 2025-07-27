export function UnorderedList({
  width = 16,
  height = 16,
  fill = 'currentColor',
  title = 'unordered-list',
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
      className={className}
      height={height}
      width={width}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g fill={fill}>
        <circle
          cx="3.75"
          cy="5.25"
          fill="none"
          r="2"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle
          cx="3.75"
          cy="12.75"
          fill="none"
          r="2"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="8.75"
          x2="16.25"
          y1="5.25"
          y2="5.25"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="8.75"
          x2="16.25"
          y1="12.75"
          y2="12.75"
        />
      </g>
    </svg>
  );
}
