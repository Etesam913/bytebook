export function RefreshAnticlockwise({
  height = 20,
  width = 20,
  fill = 'currentColor',
  title = 'Refresh',
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
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>{title}</title>
      <g fill={fill}>
        <polyline
          fill="none"
          points="7.75 8.25 10.75 8.25 10.75 11.25"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
        <polyline
          fill="none"
          points="4.25 3.75 1.25 3.75 1.25 .75"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
        <path
          d="m10.718,8.306c-.854,1.743-2.646,2.944-4.718,2.944-2.832,0-5.141-2.243-5.246-5.049"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
        <path
          d="m1.282,3.694C2.136,1.951,3.928.75,6,.75c2.832,0,5.141,2.243,5.246,5.049"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </g>
    </svg>
  );
}
