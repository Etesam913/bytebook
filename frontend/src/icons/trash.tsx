export function Trash({
  width = 20,
  height = 20,
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
      style={{ width, height }}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={secondaryfill} stroke={secondaryfill}>
        <line
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
          x1="2.75"
          x2="15.25"
          y1="4.25"
          y2="4.25"
        />
        <line
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
          x1="7.25"
          x2="7.25"
          y1="8.75"
          y2="13.25"
        />
        <line
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
          x1="10.75"
          x2="10.75"
          y1="8.75"
          y2="13.25"
        />
        <path
          d="M6.75,4.25v-1.5c0-.552,.448-1,1-1h2.5c.552,0,1,.448,1,1v1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
        />
        <path
          d="M13.75,6.75v7.5c0,1.105-.895,2-2,2H6.25c-1.105,0-2-.895-2-2V6.75"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
        />
      </g>
    </svg>
  );
}
