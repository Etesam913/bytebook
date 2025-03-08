export function Subtitles({
  width = '1.25rem',
  height = '1.25rem',
  fill = 'currentColor',
  secondaryfill = 'currentColor',
  title = 'Subtitles',
}: {
  width?: string;
  height?: string;
  fill?: string;
  secondaryfill?: string;
  title?: string;
}) {
  return (
    <svg
      style={{ width, height }}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      <g fill={fill}>
        <rect
          height="12.5"
          width="14.5"
          fill="none"
          rx="2"
          ry="2"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform="translate(18 18) rotate(180)"
          x="1.75"
          y="2.75"
        />
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="4.75"
          x2="9.75"
          y1="9.25"
          y2="9.25"
        />
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="12.25"
          x2="13.25"
          y1="9.25"
          y2="9.25"
        />
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="13.25"
          x2="8.25"
          y1="12.25"
          y2="12.25"
        />
        <line
          fill="none"
          stroke={secondaryfill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="5.75"
          x2="4.75"
          y1="12.25"
          y2="12.25"
        />
      </g>
    </svg>
  );
}
