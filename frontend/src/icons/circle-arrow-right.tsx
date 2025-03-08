export function CircleArrowRight({
  width = 20,
  height = 20,
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  title = 'Next',
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
      style={{ width, height }}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g fill={fill}>
        <polyline
          fill="none"
          points="9.75 6.5 12.25 9 9.75 11.5"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="12.25"
          x2="5.75"
          y1="9"
          y2="9"
        />
        <circle
          cx="9"
          cy="9"
          fill="none"
          r="7.25"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
