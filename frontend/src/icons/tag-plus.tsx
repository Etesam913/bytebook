export function TagPlus({
  width = 20,
  height = 20,
  fill = 'currentColor',
  strokeWidth = 1.5,
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;
  strokeWidth?: number;
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
      <g fill={fill}>
        <circle cx="6.25" cy="6.25" fill={fill} r="1.25" stroke="none" />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x1="14.25"
          x2="14.25"
          y1="3.25"
          y2="8.25"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x1="16.75"
          x2="11.75"
          y1="5.75"
          y2="5.75"
        />
        <path
          d="M10.401,3.651l-.816-.816c-.375-.375-.884-.586-1.414-.586H3.25c-.552,0-1,.448-1,1v4.922c0,.53,.211,1.039,.586,1.414l5.75,5.75c.781,.781,2.047,.781,2.828,0l3.922-3.922c.364-.364,.551-.833,.576-1.31"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  );
}
