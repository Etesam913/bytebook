export function ChevronDown({
  width = '0.8rem',
  height = '0.8rem',
  fill = 'currentColor',
  className,
  strokeWidth = '1.5',
}: {
  width?: string;
  height?: string;
  fill?: string;
  className?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      className={className}
      style={{ width, height }}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <polyline
          fill="none"
          points="15.25 6.5 9 12.75 2.75 6.5"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  );
}
