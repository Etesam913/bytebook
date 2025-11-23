export function SearchContent2({
  height = 20,
  width = 20,
  ...props
}: {
  height?: number;
  width?: number;
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="1.75" y1="11.25" x2="3.8217" y2="11.25" />
      <line x1="1.75" y1="7.25" x2="4.4266" y2="7.25" />
      <line x1="1.75" y1="3.25" x2="12.25" y2="3.25" />
      <line x1="13.5784" y1="13.0784" x2="16.25" y2="15.75" />
      <circle cx="10.75" cy="10.25" r="4" />
    </svg>
  );
}
