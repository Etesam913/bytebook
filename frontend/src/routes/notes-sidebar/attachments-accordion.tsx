import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "../../icons/chevron-down";

export function AttachmentsAccordion() {
	const [isAttachmentsCollapsed, setIsAttachmentsCollapsed] = useState(true);

	return (
		<section className="flex flex-col gap-2 overflow-y-auto">
			<button
				className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 py-1 px-1.5 rounded-md transition-colors"
				onClick={() => setIsAttachmentsCollapsed((prev) => !prev)}
				type="button"
			>
				<motion.span
					initial={{ rotateZ: isAttachmentsCollapsed ? 270 : 0 }}
					animate={{ rotateZ: isAttachmentsCollapsed ? 270 : 0 }}
				>
					<ChevronDown strokeWidth="2.5px" height="0.8rem" width="0.8rem" />
				</motion.span>{" "}
				Attachments
			</button>
			<ul className="overflow-y-auto pb-2"></ul>
		</section>
	);
}
