export function TextItalic({
  height = 16,
  width = 16,
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;
  secondaryfill?: string;
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
      <g fill={secondaryfill} stroke={secondaryfill}>
        <polyline
          fill="none"
          points="8.25 14.25 10.75 5.75 8.25 5.75"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="2" r="1" stroke="none" />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="5.75"
          x2="10.75"
          y1="14.25"
          y2="14.25"
        />
      </g>
    </svg>
  );
}
