export function ShareRight({
  fill = 'currentColor',
  secondaryfill: initialSecondaryfill,
  strokewidth = 1.75,
  width = 20,
  height = 20,
  title = 'share right',
}: {
  fill?: string;
  secondaryfill?: string;
  strokewidth?: number;
  width?: number;
  height?: number;
  title?: string;
}) {
  const secondaryfill = initialSecondaryfill || fill;

  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g fill={fill}>
        <path
          d="M14.25,10.75v2.5c0,1.105-.895,2-2,2H4.75c-1.105,0-2-.895-2-2V5.75c0-1.105,.895-2,2-2h3.5"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
        <path
          d="M16,5h-3.25c-2.209,0-4,1.791-4,4"
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
        <polyline
          fill="none"
          points="13 1.75 16.25 5 13 8.25"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
      </g>
    </svg>
  );
}
