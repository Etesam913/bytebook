import { type MotionValue, motion } from "framer-motion";
import { getDefaultButtonVariants } from "../../animations";
import { MotionButton } from "../../components/buttons";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { Trash } from "../../icons/trash";
import { MyTrashAccordion } from "./my-trash-accordion";

export function TrashSidebar({
	width,
	leftWidth,
}: { width: MotionValue<number>; leftWidth: MotionValue<number> }) {
	return (
		<>
			<motion.aside
				className="text-md flex h-screen flex-col overflow-y-auto pb-3.5"
				style={{ width }}
			>
				<div className="flex h-full flex-col overflow-y-auto pl-1.5 pr-2.5 relative">
					<section className="flex items-center h-[3.625rem] gap-2">
						<Trash /> <p>Trash</p>
					</section>
					<div className="flex h-full flex-col gap-2">
						<MotionButton
							{...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
							className="align-center flex w-full justify-between bg-transparent"
						>
							Empty Trash
							<Trash />
						</MotionButton>
						<MyTrashAccordion />
					</div>
				</div>
			</motion.aside>
			<Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
		</>
	);
}
