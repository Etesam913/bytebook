export function PinTack2({
  width = 20,
  height = 20,
  fill = 'currentColor',
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
      height={height}
      width={width}
      className={className}
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
          x1="3.081"
          x2="6.409"
          y1="14.919"
          y2="11.591"
        />
        <path
          d="M10.371,15.553c.432-.557,1.02-1.47,1.348-2.718,.169-.642,.23-1.224,.243-1.701l3.005-3.005c.781-.781,.781-2.047,0-2.828l-2.268-2.268c-.781-.781-2.047-.781-2.828,0l-3.005,3.005c-.478,.013-1.059,.074-1.701,.243-1.248,.328-2.161,.916-2.718,1.348l7.925,7.925Z"
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
