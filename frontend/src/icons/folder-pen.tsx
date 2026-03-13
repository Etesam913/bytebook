export function FolderPen({
  width = 20,
  height = 20,
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  className,
  strokeWidth = 1.5,
}: {
  width?: number;
  height?: number;
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
          d="M2.25 8.75V4.75C2.25 3.645 3.145 2.75 4.25 2.75H6.201C6.808 2.75 7.381 3.02499 7.761 3.49799L8.364 4.25H13.75C14.855 4.25 15.75 5.145 15.75 6.25V8.28101"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M15.689 8.28101C15.477 7.40401 14.692 6.75 13.75 6.75H4.25C3.145 6.75 2.25 7.646 2.25 8.75V13.25C2.25 14.354 3.145 15.25 4.25 15.25H8.4503"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M13.7959 16.4542L16.9571 13.293C17.3476 12.9025 17.3476 12.2693 16.9571 11.8788L16.3713 11.293C15.9808 10.9025 15.3476 10.9025 14.9571 11.293L11.7959 14.4542L11.0001 17.2501L13.7959 16.4542Z"
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
