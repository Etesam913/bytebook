export function Heading5({
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
          d="M15.714,4.75h-4.746l-.317,3.86c1.691-1.025,3.759-1.069,4.891,.181,1.022,1.128,.868,2.697-.012,3.639s-3.515,1.491-5.029-.755"
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
