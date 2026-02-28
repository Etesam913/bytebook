export function TableColsMinus2({
  fill = 'currentColor',
  secondaryfill: initialSecondaryfill,
  strokewidth = 1.75,
  width = 20,
  height = 20,
  className,
}: {
  fill?: string;
  secondaryfill?: string;
  strokewidth?: number;
  width?: number;
  height?: number;
  className?: string;
}) {
  const secondaryfill = initialSecondaryfill || fill;

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
          d="M15.75 11.75V4.75C15.75 3.65 14.855 2.75 13.75 2.75H4.25C3.145 2.75 2.25 3.65 2.25 4.75V13.25C2.25 14.35 3.145 15.25 4.25 15.25H9.2916"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
        <path
          d="M11.25 2.75V11.9208"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
        <path
          d="M6.75 2.75V15.25"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
        <path
          d="M17.25 14.75H12.25"
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokewidth}
        />
      </g>
    </svg>
  );
}
