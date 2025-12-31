export function DividerYDotted({
  width = 20,
  height = 20,
  fill = 'currentColor',
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fill={fill}>
        <path
          d="m2.75,2.25v1.5c0,1.105.895,2,2,2h8.5c1.105,0,2-.895,2-2v-1.5"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="m2.75,15.75v-1.5c0-1.105.895-2,2-2h8.5c1.105,0,2,.895,2,2v1.5"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle cx="2.75" cy="9" fill={fill} r=".75" strokeWidth="0" />
        <circle cx="5.875" cy="9" fill={fill} r=".75" strokeWidth="0" />
        <circle cx="9" cy="9" fill={fill} r=".75" strokeWidth="0" />
        <circle cx="12.125" cy="9" fill={fill} r=".75" strokeWidth="0" />
        <circle cx="15.25" cy="9" fill={fill} r=".75" strokeWidth="0" />
      </g>
    </svg>
  );
}
