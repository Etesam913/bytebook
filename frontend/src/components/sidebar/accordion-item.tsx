import { motion } from "framer-motion";
import { Link } from "wouter";
import { Note } from "../../icons/page";
import { cn } from "../../utils/string-formatting";

export function AccordionItem({
	to,
	itemName,
}: { to: string; itemName: string }) {
	return (
		<motion.li
			layout
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{
				type: "spring",
				damping: 18,
				stiffness: 110,
			}}
		>
			<div className="flex select-none items-center gap-2 overflow-hidden pr-1 text-zinc-600 dark:text-zinc-300">
				<Link
					title={itemName}
					target="_blank"
					className={cn(
						"flex flex-1 items-center gap-2 overflow-x-hidden rounded-md px-2 py-1",
					)}
					to={`/${encodeURI(to)}`}
				>
					<Note className="min-w-4" title="" width="1rem" height="1rem" />
					<p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">
						{itemName}
					</p>
				</Link>
			</div>
		</motion.li>
	);
}
