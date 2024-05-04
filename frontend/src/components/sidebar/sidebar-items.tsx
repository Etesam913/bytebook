import { AnimatePresence } from "framer-motion";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { SidebarHighlight } from "./highlight";

export function SidebarItems({
	data,
	getContextMenuStyle,
	hoveredIndex,
	setHoveredIndex,
	comparisonValue,
	renderLink,
}: {
	data: string[] | null;
	getContextMenuStyle: (dataItem: string) => CSSProperties;
	hoveredIndex: number | null;
	setHoveredIndex: Dispatch<SetStateAction<number | null>>;
	comparisonValue: string | undefined;
	renderLink: (dataItem: string) => ReactNode;
}) {
	const dataElements = data?.map((dataItem, i) => (
		<li
			onMouseEnter={() => setHoveredIndex(i)}
			onMouseLeave={() => setHoveredIndex(null)}
			key={dataItem}
			className="py-[.1rem]"
			style={getContextMenuStyle(dataItem)}
		>
			<div className="flex items-center relative select-none rounded-md">
				<AnimatePresence>
					{hoveredIndex === i && dataItem !== comparisonValue && (
						<SidebarHighlight layoutId="folder-highlight" />
					)}
				</AnimatePresence>
				{/* <Link
					target="_blank"
					className={cn(
						"flex flex-1 gap-2 items-center px-2 py-1 rounded-md relative z-10 overflow-x-hidden",
						dataItem === comparisonValue && "bg-zinc-150 dark:bg-zinc-700",
					)}
					to={`/${encodeURI(getUrl(dataItem))}`}
				>
					{dataItem === comparisonValue ? (
						<>{activeIcon} </>
					) : (
						<>{defaultIcon} </>
					)}{" "}
					<p className="whitespace-nowrap text-ellipsis overflow-hidden">
						{dataItem}
					</p>
				</Link> */}
				{renderLink(dataItem)}
			</div>
		</li>
	));
	return <>{dataElements}</>;
}
