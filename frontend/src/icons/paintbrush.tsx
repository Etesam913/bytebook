export function Paintbrush({
  width = '1.25rem',
  height = '1.25rem',
  fill = 'currentColor',
  title = 'paperclip',
  className,
}: {
  width?: string;
  height?: string;
  fill?: string;
  secondaryfill?: string;
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
        <path
          d="M6.956,9.044L13.534,2.466c.621-.621,1.629-.621,2.25,0h0c.621,.621,.621,1.629,0,2.25l-6.578,6.578"
          fill="none"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M1.75,14.706c2.703,.812,4.896,.88,6.689-.955,1.081-1.085,1.081-2.845,0-3.931s-2.826-1.102-3.916,0c-1.773,1.792-.225,3.494-2.773,4.886Z"
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
