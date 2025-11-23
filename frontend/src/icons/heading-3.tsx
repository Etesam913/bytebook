export function Heading3({
  fill = 'currentColor',
  width = 20,
  height = 20,
}: {
  fill?: string;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={fill}>
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="1.75"
          x2="1.75"
          y1="4.75"
          y2="13.25"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="7.75"
          x2="7.75"
          y1="4.75"
          y2="13.25"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="1.75"
          x2="7.75"
          y1="9"
          y2="9"
        />
        <path
          d="M10.75,4.75h5.542l-4.005,3.462c1.322-.342,2.672-.141,3.505,.744,1.022,1.086,.868,2.597-.012,3.505s-3.515,1.436-5.029-.727"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}
