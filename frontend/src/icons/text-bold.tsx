export function TextBold({
  width = 16,
  height = 16,
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  title = 'text-bold',
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;
  secondaryfill?: string;
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
      <g fill={secondaryfill} stroke={secondaryfill}>
        <path
          d="M6.25,2.25h3.75c1.795,0,3.25,1.455,3.25,3.25h0c0,1.795-1.455,3.25-3.25,3.25h-3.75"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M6.25,8.75h4.5c1.933,0,3.5,1.567,3.5,3.5h0c0,1.933-1.567,3.5-3.5,3.5H6.25"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M6.25,15.75h-1.5c-.552,0-1-.448-1-1V3.25c0-.552,.448-1,1-1h1.5V15.75Z"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
