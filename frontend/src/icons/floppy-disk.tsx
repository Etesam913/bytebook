export function FloppyDisk({
  width = 20,
  height = 20,
  fill = 'currentColor',
  secondaryfill = 'currentColor',
}: {
  width?: number;
  height?: number;
  fill?: string;
  secondaryfill?: string;
}) {
  return (
    <svg
      style={{ width, height }}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={secondaryfill} stroke={secondaryfill}>
        <path
          d="M10.75,2.25v3c0,.552-.448,1-1,1h-3.5c-.552,0-1-.448-1-1V2.25"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M5.25,15.75v-5c0-.552,.448-1,1-1h5.5c.552,0,1,.448,1,1v5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M13.59,15.75H4.41c-1.193,0-2.16-.967-2.16-2.16V4.41c0-1.193,.967-2.16,2.16-2.16h7.426c.265,0,.52,.105,.707,.293l2.914,2.914c.188,.188,.293,.442,.293,.707v7.426c0,1.193-.967,2.16-2.16,2.16Z"
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
