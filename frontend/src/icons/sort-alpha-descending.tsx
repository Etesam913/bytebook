function SortAlphaDescending({
  width = 18,
  height = 18,
  fill = 'currentColor',
  title = 'sort alpha descending',
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
      className={className}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g fill={fill}>
        <polyline
          fill="none"
          points="16 11.25 13.25 14 10.5 11.25"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <polyline
          fill="none"
          points="7.357 7.5 5.275 2 4.702 2 2.621 7.5"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <polyline
          fill="none"
          points="2.832 10 7.145 10 2.832 15.5 7.145 15.5"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="13.25"
          x2="13.25"
          y1="14"
          y2="3.5"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="3.189"
          x2="6.789"
          y1="6"
          y2="6"
        />
      </g>
    </svg>
  );
}

export default SortAlphaDescending;
