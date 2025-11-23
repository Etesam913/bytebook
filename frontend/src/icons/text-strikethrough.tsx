export function TextStrikethrough({
  width = 16,
  height = 16,
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;
  secondaryfill?: string;
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
      <g fill={secondaryfill} stroke={secondaryfill}>
        <path
          d="M13,11.336c.091,.274,.145,.579,.153,.919,.051,2.076-1.817,3.495-4.074,3.495-2.157,0-3.655-.839-4.234-2.736"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M12.774,4.626c-.819-1.937-2.456-2.376-3.695-2.376-1.152,0-4.174,.612-3.894,3.515,.196,2.037,2.117,2.796,3.794,3.095,.221,.039,.454,.085,.694,.139"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <line
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="2"
          x2="16"
          y1="9"
          y2="9"
        />
      </g>
    </svg>
  );
}
