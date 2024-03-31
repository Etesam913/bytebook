export function OrderedList({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	title = "list-checkbox",
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
			className={className}
			style={{ width, height }}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g fill={fill}>
				<path
					d="M2.5,11.661c.259-.921,1.152-1.425,2.116-1.411,.965,.014,1.872,.446,1.929,1.411s-.965,1.612-2.023,2.044c-1.058,.432-1.936,.835-2.023,2.044H6.548"
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>
				<path
					d="M4.75,7.5V2s-.63,1.108-1.967,1.364"
					fill="none"
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
					x1="9.5"
					x2="16.25"
					y1="5.25"
					y2="5.25"
				/>
				<line
					fill="none"
					stroke={fill}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					x1="9.5"
					x2="16.25"
					y1="12.75"
					y2="12.75"
				/>
			</g>
		</svg>
	);
}
