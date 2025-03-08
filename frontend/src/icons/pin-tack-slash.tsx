export function PinTackSlash({
  width = 20,
  height = 20,
  fill = 'currentColor',
  strokeWidth = 1.5,
  title = 'pin tack slash',
  className,
}: {
  className?: string;
  width?: number;
  height?: number;
  fill?: string;
  strokeWidth?: number;
  title?: string;
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
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x1="9"
          x2="9"
          y1="16.25"
          y2="12.25"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x1="2"
          x2="16"
          y1="16"
          y2="2"
        />
        <path
          d="M9,12.25h5.25c-.089-.699-.318-1.76-.969-2.875-.148-.254-.303-.484-.458-.693"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M12.25,5.75v-2c0-1.105-.895-2-2-2h-2.5c-1.105,0-2,.895-2,2v4.25c-.329,.347-.697,.801-1.031,1.375-.65,1.115-.88,2.176-.969,2.875h2"
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
