import { type MotionValue, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useParams } from "wouter";
import { navigate } from "wouter/use-browser-location";
import {
	ClearTrash,
	GetFilesInTrash,
} from "../../../bindings/github.com/etesam913/bytebook/folderservice";
import { getDefaultButtonVariants } from "../../animations";
import { MotionButton } from "../../components/buttons";
import { Spacer } from "../../components/folder-sidebar/spacer";
import { useTrashDelete } from "../../hooks/trash-events";
import { Trash } from "../../icons/trash";
import { useSearchParamsEntries } from "../../utils/hooks";
import { DEFAULT_SONNER_OPTIONS } from "../../utils/misc";
import { extractInfoFromNoteName } from "../../utils/string-formatting";
import { RenderNote } from "../notes-sidebar/render-note";
import { MyTrashAccordion } from "./my-trash-accordion";

export function TrashSidebar({
	width,
	leftWidth,
}: { width: MotionValue<number>; leftWidth: MotionValue<number> }) {
	const [files, setFiles] = useState<string[]>([]);

	const searchParams: { ext?: string } = useSearchParamsEntries();
	const fileExtension = searchParams?.ext;
	const { item: curNote } = useParams();

	useEffect(() => {
		/** Fetch files in trash when trash route is loaded for the first time*/
		async function getFilesInTrash() {
			try {
				const res = await GetFilesInTrash();
				if (res.success) {
					if (res.data.length > 0) {
						const { noteNameWithoutExtension, queryParams } =
							extractInfoFromNoteName(res.data[0]);
						navigate(
							`/trash/${encodeURIComponent(noteNameWithoutExtension)}?ext=${
								queryParams.ext
							}`,
							{ replace: true },
						);
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

	useTrashDelete(setFiles);

	return (
		<>
			<motion.aside
				className="text-md flex h-screen flex-col"
				style={{ width }}
			>
				<div className="flex h-full flex-col pl-1.5 pr-2.5 relative">
					<section className="flex items-center min-h-[3.625rem] gap-2">
						<Trash /> <p>Trash</p>
					</section>
					<section className="flex flex-col gap-2 overflow-y-auto">
						{files.length > 0 && (
							<MotionButton
								{...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
								className="align-center flex w-full justify-between bg-transparent"
								onClick={async () => {
									try {
										const res = await ClearTrash();
										if (res.success) {
											toast.success("Trash emptied", DEFAULT_SONNER_OPTIONS);
										} else {
											throw new Error(res.message);
										}
									} catch (err) {
										if (err instanceof Error) {
											toast.error(err.message, DEFAULT_SONNER_OPTIONS);
										}
									}
								}}
							>
								Empty Trash
								<Trash />
							</MotionButton>
						)}
						<div className="flex h-full pb-2 flex-col gap-2 overflow-y-auto">
							<MyTrashAccordion files={files} />
						</div>
					</section>
				</div>
			</motion.aside>

			<Spacer width={width} leftWidth={leftWidth} spacerConstant={8} />
			<RenderNote folder="trash" note={curNote} fileExtension={fileExtension} />
		</>
	);
}
