export function SidebarRightCollapse({
  width = 18,
  height = 18,
  fill = 'currentColor',
  strokeWidth = 1.5,
  title = 'WindowExpandTopLeft',
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;
  secondaryfill?: string;
  strokeWidth?: number;
  title?: string;
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
      <title>{title}</title>
      <g fill={fill}>
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x1="11.75"
          x2="11.75"
          y1="2.75"
          y2="15.25"
        />
        <polyline
          fill="none"
          points="7.75 6.5 5.25 9 7.75 11.5"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <rect
          height="12.5"
          width="14.5"
          fill="none"
          rx="2"
          ry="2"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x="1.75"
          y="2.75"
        />
      </g>
    </svg>
  );
}
