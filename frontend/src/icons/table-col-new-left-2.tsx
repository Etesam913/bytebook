export function TableColNewLeft2({
  fill = 'currentColor',
  secondaryfill: initialSecondaryfill,
  strokewidth = 1.75,
  width = 20,
  height = 20,
  className,
}: {
  fill?: string;
  secondaryfill?: string;
  strokewidth?: number;
  width?: number;
  height?: number;
  className?: string;
}) {
  const secondaryfill = initialSecondaryfill || fill;

  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fill={fill}>
        <rect
          height="10.5"
          width="4"
          fill="none"
          rx="1.5"
          ry="1.5"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
          x="7.25"
          y=".75"
        />
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
          x1=".75"
          x2="4.75"
          y1="6"
          y2="6"
        />
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
          x1="2.75"
          x2="2.75"
          y1="4"
          y2="8"
        />
      </g>
    </svg>
  );
}
