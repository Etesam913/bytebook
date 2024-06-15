export function PDFIcon({
	width = "1.25rem",
	height = "1.25rem",
	fill = "currentColor",
	title = "pdf-icon",
	className,
}: {
	className?: string;
	width?: string;
	height?: string;
	fill?: string;
	title?: string;
}) {
	return (
		<svg
			className={className}
			style={{ width, height }}
			viewBox="0 0 18 18"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<path
				d="M15.16 6.24999H11.75C11.198 6.24999 10.75 5.80199 10.75 5.24999V1.85199"
				stroke={fill}
				fill="none"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M2.75 14.25V3.75C2.75 2.645 3.645 1.75 4.75 1.75H10.336C10.601 1.75 10.856 1.855 11.043 2.043L14.957 5.957C15.145 6.145 15.25 6.399 15.25 6.664V14.25C15.25 15.355 14.355 16.25 13.25 16.25H4.75C3.645 16.25 2.75 15.355 2.75 14.25Z"
				stroke={fill}
				fill="none"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M5.30185 13.5227V9.77273H6.04759V10.2308H6.08132C6.11446 10.1574 6.16241 10.0829 6.22514 10.0071C6.28906 9.93016 6.37192 9.86624 6.47372 9.81534C6.5767 9.76326 6.70455 9.73722 6.85724 9.73722C7.05611 9.73722 7.23958 9.7893 7.40767 9.89347C7.57576 9.99645 7.71011 10.1521 7.81072 10.3604C7.91134 10.5676 7.96165 10.8274 7.96165 11.1399C7.96165 11.4441 7.91252 11.701 7.81428 11.9105C7.71721 12.1188 7.58464 12.2769 7.41655 12.3846C7.24964 12.4911 7.06262 12.5444 6.85547 12.5444C6.70869 12.5444 6.58381 12.5201 6.48082 12.4716C6.37902 12.4231 6.29557 12.3621 6.23047 12.2887C6.16536 12.2141 6.11565 12.139 6.08132 12.0632H6.05824V13.5227H5.30185ZM6.04226 11.1364C6.04226 11.2985 6.06475 11.44 6.10973 11.5607C6.15471 11.6815 6.21982 11.7756 6.30504 11.843C6.39027 11.9093 6.49384 11.9425 6.61577 11.9425C6.73887 11.9425 6.84304 11.9087 6.92827 11.8413C7.01349 11.7726 7.07801 11.6779 7.1218 11.5572C7.16679 11.4353 7.18928 11.295 7.18928 11.1364C7.18928 10.9789 7.16738 10.8404 7.12358 10.7209C7.07978 10.6013 7.01527 10.5078 6.93004 10.4403C6.84482 10.3729 6.74006 10.3391 6.61577 10.3391C6.49266 10.3391 6.38849 10.3717 6.30327 10.4368C6.21922 10.5019 6.15471 10.5942 6.10973 10.7138C6.06475 10.8333 6.04226 10.9742 6.04226 11.1364ZM9.47088 12.5444C9.26373 12.5444 9.07611 12.4911 8.90803 12.3846C8.74112 12.2769 8.60855 12.1188 8.5103 11.9105C8.41323 11.701 8.3647 11.4441 8.3647 11.1399C8.3647 10.8274 8.41501 10.5676 8.51562 10.3604C8.61624 10.1521 8.75 9.99645 8.9169 9.89347C9.08499 9.7893 9.26906 9.73722 9.46911 9.73722C9.6218 9.73722 9.74905 9.76326 9.85085 9.81534C9.95384 9.86624 10.0367 9.93016 10.0994 10.0071C10.1634 10.0829 10.2119 10.1574 10.245 10.2308H10.2681V8.86364H11.0227V12.5H10.277V12.0632H10.245C10.2095 12.139 10.1592 12.2141 10.0941 12.2887C10.0302 12.3621 9.94673 12.4231 9.84375 12.4716C9.74195 12.5201 9.61766 12.5444 9.47088 12.5444ZM9.71058 11.9425C9.8325 11.9425 9.93549 11.9093 10.0195 11.843C10.1048 11.7756 10.1699 11.6815 10.2148 11.5607C10.261 11.44 10.2841 11.2985 10.2841 11.1364C10.2841 10.9742 10.2616 10.8333 10.2166 10.7138C10.1716 10.5942 10.1065 10.5019 10.0213 10.4368C9.93608 10.3717 9.8325 10.3391 9.71058 10.3391C9.58629 10.3391 9.48153 10.3729 9.39631 10.4403C9.31108 10.5078 9.24657 10.6013 9.20277 10.7209C9.15897 10.8404 9.13707 10.9789 9.13707 11.1364C9.13707 11.295 9.15897 11.4353 9.20277 11.5572C9.24775 11.6779 9.31226 11.7726 9.39631 11.8413C9.48153 11.9087 9.58629 11.9425 9.71058 11.9425ZM13.1112 9.77273V10.3409H11.428V9.77273H13.1112ZM11.8133 12.5V9.57564C11.8133 9.37796 11.8518 9.21401 11.9287 9.08381C12.0068 8.9536 12.1134 8.85594 12.2483 8.79084C12.3833 8.72573 12.5365 8.69318 12.7082 8.69318C12.8242 8.69318 12.9301 8.70206 13.026 8.71982C13.1231 8.73757 13.1953 8.75355 13.2426 8.76776L13.1077 9.33594C13.0781 9.32647 13.0414 9.31759 12.9976 9.3093C12.955 9.30102 12.9112 9.29688 12.8662 9.29688C12.7549 9.29688 12.6774 9.32292 12.6336 9.375C12.5898 9.4259 12.5679 9.49751 12.5679 9.58984V12.5H11.8133Z"
				fill={fill}
			/>
		</svg>
	);
}