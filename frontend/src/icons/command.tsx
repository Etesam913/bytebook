export function Command({
  width = 20,
  height = 20,
  fill = 'currentColor',
  title = 'command',
  className,
}: {
  width?: number;
  height?: number;
  fill?: string;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>{title}</title>
      <g fill={fill}>
        <rect
          height="4.5"
          width="4.5"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x="6.75"
          y="6.75"
        />
        <path
          d="M4.75,2.75h0c1.104,0,2,.896,2,2v2h-2c-1.104,0-2-.896-2-2h0c0-1.104,.896-2,2-2Z"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M13.25,2.75h0c1.104,0,2,.896,2,2v2h-2c-1.104,0-2-.896-2-2h0c0-1.104,.896-2,2-2Z"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform="translate(18 -8.5) rotate(90)"
        />
        <path
          d="M13.25,11.25h0c1.104,0,2,.896,2,2v2h-2c-1.104,0-2-.896-2-2h0c0-1.104,.896-2,2-2Z"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform="translate(26.5 26.5) rotate(-180)"
        />
        <path
          d="M4.75,11.25h0c1.104,0,2,.896,2,2v2h-2c-1.104,0-2-.896-2-2h0c0-1.104,.896-2,2-2Z"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform="translate(-8.5 18) rotate(-90)"
        />
      </g>
    </svg>
  );
}
