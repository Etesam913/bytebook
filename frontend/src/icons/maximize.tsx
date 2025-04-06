export function Maximize({
  width = 18,
  height = 18,
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  title = 'Maximize',
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;
  secondaryfill?: string;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      height={height}
      width={width}
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g fill={fill}>
        <polyline
          fill="none"
          points="10.25 5.75 10.25 1.75 6.25 1.75"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
        <polyline
          fill="none"
          points="1.75 6.25 1.75 10.25 5.75 10.25"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </g>
    </svg>
  );
}
