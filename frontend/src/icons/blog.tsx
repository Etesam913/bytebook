export function Blog({
  width = '1.25rem',
  height = '1.25rem',
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  className,
  strokeWidth = 1.5,
}: {
  width?: string;
  height?: string;
  fill?: string;
  secondaryfill?: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      style={{ width, height }}
      className={className}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <path
          d="M8.0425 15.75H4.75C3.645 15.75 2.75 14.855 2.75 13.75V3.75C2.75 2.645 3.645 1.75 4.75 1.75H12.75C13.855 1.75 14.75 2.645 14.75 3.75V7.1048"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M5.75 5.75H11.75"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M5.75 8.75H11.75"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M5.75 11.75H8.25"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M13.7959 15.4542L16.9571 12.293C17.3476 11.9025 17.3476 11.2693 16.9571 10.8788L16.3713 10.293C15.9808 9.9025 15.3476 9.9025 14.9571 10.293L11.7959 13.4542L11.0001 16.2501L13.7959 15.4542Z"
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  );
}
