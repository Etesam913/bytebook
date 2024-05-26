import { type MotionValue, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRoute } from "wouter";
import { navigate } from "wouter/use-browser-location";
import {
	ClearTrash,
	GetFilesInTrash,
} from "../../../bindings/github.com/etesam913/bytebook/folderservice";
import { getDefaultButtonVariants } from "../../animations";
import { MotionButton } from "../../components/buttons";
import { TrashEditor } from "../../components/editor/trash-editor";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { Trash } from "../../icons/trash";
import { MyTrashAccordion } from "./my-trash-accordion";

export function TrashSidebar({
	width,
	leftWidth,
}: { width: MotionValue<number>; leftWidth: MotionValue<number> }) {
	const [, params] = useRoute("/trash/:item?");
	const [files, setFiles] = useState<string[]>([]);

	const item = params?.item;

	useEffect(() => {
		async function getFilesInTrash() {
			try {
				const res = await GetFilesInTrash();
				if (res.success) {
					if (res.data.length > 0) {
						navigate(`/trash/${res.data[0]}`, { replace: true });
					}
					setFiles(res.data);
					return;
				}
				throw new Error(res.message);
			} catch (err) {
				if (err instanceof Error) {
					toast.error(err.message);
				}
			}
		}
		getFilesInTrash();
	}, []);

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
						{files.length > 0 && (
							<MotionButton
								{...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
								className="align-center flex w-full justify-between bg-transparent"
								onClick={() => {
									ClearTrash()
										.then((res) => {
											if (res.success) {
												toast.success("Trash emptied");
												setFiles([]);
											} else throw new Error(res.message);
										})
										.catch((err) => toast.error(err.message));
								}}
							>
								Empty Trash
								<Trash />
							</MotionButton>
						)}
						<MyTrashAccordion files={files} curFile={item} />
					</div>
				</div>
			</motion.aside>
			<Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
			{item && item.endsWith(".md") && <TrashEditor curFile={item} />}
		</>
	);
}
