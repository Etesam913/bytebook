export function ArrowDoorIn({
  width = 20,
  height = 20,
  fill = 'currentColor',
  className,
  strokeWidth = '1.5',
}: {
  width?: number;
  height?: number;
  fill?: string;
  className?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      strokeWidth={strokeWidth}
    >
      <g fill={fill}>
        <path
          d="M7.25,5.75V3.25c0-.552,.448-1,1-1h6.5c.552,0,1,.448,1,1V14.75c0,.552-.448,1-1,1h-6.5c-.552,0-1-.448-1-1v-2.5"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M15.543,2.648l-3.321,2.059c-.294,.182-.473,.504-.473,.85v6.887c0,.346,.179,.667,.473,.85l3.322,2.06"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <polyline
          fill="none"
          points="4 11.75 6.75 9 4 6.25"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x1="6.75"
          x2=".75"
          y1="9"
          y2="9"
        />
      </g>
    </svg>
  );
}
