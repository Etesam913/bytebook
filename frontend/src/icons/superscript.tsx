function Superscript({
  width = '1.25rem',
  height = '1.25rem',
  fill = 'currentColor',
  title = 'superscript',
  className,
}: {
  width?: string;
  height?: string;
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
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="2.073"
          x2="10.427"
          y1="3.75"
          y2="14.25"
        />
        <line
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="2.073"
          x2="10.427"
          y1="14.25"
          y2="3.75"
        />
        <path
          d="M12.938,2.905c.212-.754,.942-1.166,1.732-1.154,.789,.012,1.531,.365,1.578,1.154s-.789,1.319-1.655,1.673c-.866,.353-1.584,.683-1.655,1.673h3.312"
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

export default Superscript;
