export function SquareCode({
  width = '1.25rem',
  height = '1.25rem',
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  title = 'SquareCode',
  className,
}: {
  width?: string;
  height?: string;
  fill?: string;
  secondaryfill?: string;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      style={{ width, height }}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g fill={fill}>
        <polyline
          fill="none"
          points="14 6.25 16.25 4 14 1.75"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
        <polyline
          fill="none"
          points="11 6.25 8.75 4 11 1.75"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
        <path
          d="M6.596,2.75h-1.846c-1.105,0-2,.896-2,2V13.25c0,1.104,.895,2,2,2H13.25c1.105,0,2-.896,2-2v-4.846"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
      </g>
    </svg>
  );
}
