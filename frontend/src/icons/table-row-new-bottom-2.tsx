export function TableRowNewBottom2({
  fill = 'currentColor',
  secondaryfill: initialSecondaryfill,
  strokewidth = 1.75,
  width = '1.25rem',
  height = '1.25rem',
  className,
}: {
  fill?: string;
  secondaryfill?: string;
  strokewidth?: number;
  width?: string;
  height?: string;
  className?: string;
}) {
  const secondaryfill = initialSecondaryfill || fill;

  return (
    <svg
      style={{ width, height }}
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
          transform="translate(3.25 8.75) rotate(-90)"
          x="4"
          y="-2.5"
        />
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
          x1="6"
          x2="6"
          y1="11.25"
          y2="7.25"
        />
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
          x1="4"
          x2="8"
          y1="9.25"
          y2="9.25"
        />
      </g>
    </svg>
  );
}
