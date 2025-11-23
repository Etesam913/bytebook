export function QuoteIcon({
  width = 20,
  height = 20,
  fill = 'currentColor',
  className,
  secondaryfill,
}: {
  width?: number;
  height?: number;
  fill?: string;
  className?: string;
  secondaryfill?: string;
}) {
  const actualSecondaryFill = secondaryfill || fill;
  return (
    <svg
      height={height}
      width={width}
      className={className}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="2.75"
          x2="15.25"
          y1="14.25"
          y2="14.25"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="2.75"
          x2="15.25"
          y1="10.75"
          y2="10.75"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="12.25"
          x2="15.25"
          y1="7.25"
          y2="7.25"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="12.25"
          x2="15.25"
          y1="3.75"
          y2="3.75"
        />
        <path
          d="M2.75,5.75h2v1.5H2.75v-1.5c0-1.793,.598-2.582,1.674-3"
          fill="none"
          stroke={actualSecondaryFill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M7.25,5.75h2v1.5h-2v-1.5c0-1.793,.598-2.582,1.674-3"
          fill="none"
          stroke={actualSecondaryFill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
