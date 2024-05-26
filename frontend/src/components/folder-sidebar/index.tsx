import { AnimatePresence, type MotionValue, motion } from "framer-motion";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { AddNoteToFolder } from "../../../bindings/github.com/etesam913/bytebook/noteservice.ts";
import { WINDOW_ID } from "../../App.tsx";
import { getDefaultButtonVariants } from "../../animations.ts";
import { foldersAtom, isFolderDialogOpenAtom } from "../../atoms";
import { CircleArrowLeft } from "../../icons/circle-arrow-left.tsx";
import { CircleArrowRight } from "../../icons/circle-arrow-right.tsx";
import { FolderPlus } from "../../icons/folder-plus";
import { Gear } from "../../icons/gear.tsx";
import { updateFolders } from "../../utils/fetch-functions";
import { useWailsEvent } from "../../utils/hooks.tsx";
import { MotionButton, MotionIconButton } from "../buttons";
import { BottomItems } from "./bottom-items.tsx";
import { MyFoldersAccordion } from "./my-folders-accordion.tsx";
import { RecentNotesAccordion } from "./recent-notes-accordion.tsx";
import { FolderSidebarDialog } from "./sidebar-dialog";
import { Spacer } from "./spacer";

export function FolderSidebar({ width }: { width: MotionValue<number> }) {
	const [, params] = useRoute("/:folder/:note?");
	const folder = params?.folder;
	const [isFolderDialogOpen, setIsFolderDialogOpen] = useAtom(
		isFolderDialogOpenAtom,
	);
	const [folders, setFolders] = useAtom(foldersAtom);

	useWailsEvent("folder:create", (body) => {
		const data = body.data as { folder: string };

		AddNoteToFolder(data.folder, "Untitled")
			.then((res) => {
				if (res.success) navigate(`/${data.folder}/Untitled`);
				else throw new Error(res.message);
			})
			.catch((e) => console.error(e));

		setFolders((prev) => (prev ? [...prev, data.folder] : [data.folder]));
	});

	useWailsEvent("folder:delete", (body) => {
		const data = body.data as { folder: string };
		setFolders((prev) => {
			if (prev) {
				const newFolders = prev.filter((folder) => folder !== data.folder);
				if (newFolders.length > 0) {
					navigate(`/${newFolders[0]}`);
				} else {
					navigate("/");
				}
				return newFolders;
			}
			navigate("/");
			return [];
		});
	});

	useWailsEvent("folder:context-menu:delete", (body) => {
		const [folderName, windowId] = (body.data as string).split(",");
		if (windowId === WINDOW_ID) {
			setIsFolderDialogOpen({
				isOpen: true,
				action: "delete",
				folderName,
			});
		}
	});

	useWailsEvent("folder:context-menu:rename", (event) => {
		const [folderName, windowId] = (event.data as string).split(",");
		if (windowId === WINDOW_ID) {
			setIsFolderDialogOpen({
				isOpen: true,
				action: "rename",
				folderName,
			});
		}
	});

	// Initially fetches folders from filesystem
	useEffect(() => {
		updateFolders(setFolders);
	}, [setFolders]);

	if (folder === "settings") return null;

	return (
		<>
			<AnimatePresence>
				{isFolderDialogOpen.isOpen && (
					<FolderSidebarDialog
						isFolderDialogOpen={isFolderDialogOpen}
						setIsFolderDialogOpen={setIsFolderDialogOpen}
						folders={folders ?? []}
					/>
				)}
			</AnimatePresence>
			<motion.aside
				style={{ width }}
				className="text-md flex h-screen flex-col px-[10px]"
			>
				<div className="h-[3.625rem] flex gap-0.5 justify-end items-center">
					<MotionIconButton
						{...getDefaultButtonVariants()}
						title="Go Back"
						onClick={() => window.history.back()}
					>
						<CircleArrowLeft title="Go Back" />
					</MotionIconButton>

					<MotionIconButton
						onClick={() => window.history.forward()}
						{...getDefaultButtonVariants()}
						title="Go Forward"
					>
						<CircleArrowRight title="Go Forward" />
					</MotionIconButton>
					<Link to="/settings">
						<MotionIconButton {...getDefaultButtonVariants()} title="Settings">
							<Gear title="Settings" />
						</MotionIconButton>
					</Link>
				</div>
				<div className="flex h-full flex-col gap-2">
					<MotionButton
						{...getDefaultButtonVariants(false, 1.05, 0.95, 1.05)}
						className="align-center mb-2 flex w-full justify-between bg-transparent"
						onClick={() =>
							setIsFolderDialogOpen({
								isOpen: true,
								action: "create",
								folderName: "",
							})
						}
					>
						Create Folder <FolderPlus />
					</MotionButton>
					<RecentNotesAccordion />
					<MyFoldersAccordion folder={folder} />
					<BottomItems />
				</div>
			</motion.aside>
			<Spacer width={width} />
		</>
	);
}
