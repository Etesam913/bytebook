import { motion } from "framer-motion";
import { Link } from "wouter";
import { Note } from "../../icons/page";

export function AccordionItem({
	to,
	itemName,
	onContextMenu,
}: {
	to: string;
	itemName: string;
	onContextMenu?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
}) {
	return (
		<motion.li
			// layout
			className="overflow-x-hidden"
			// initial={{ opacity: 0 }}
			// animate={{ opacity: 1 }}
			// transition={{
			// 	type: "spring",
			// 	damping: 18,
			// 	stiffness: 110,
			// }}
		>
			<div className="flex select-none items-center gap-2 overflow-hidden pr-1 text-zinc-600 dark:text-zinc-300">
				<Link
					onContextMenu={onContextMenu}
					title={itemName}
					target="_blank"
					className="flex flex-1 items-center gap-2 overflow-x-hidden rounded-md px-2 py-1"
					to={`/${encodeURI(to)}`}
				>
					<Note className="min-w-4" title="" width={16} height={16} />
					<p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">
						{itemName}
					</p>
				</Link>
			</div>
		</motion.li>
	);
}
