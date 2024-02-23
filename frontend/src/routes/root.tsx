import { useMotionValue } from "framer-motion";
import { FolderSidebar } from "../components/folder-sidebar";

export function Root() {
	const folderSidebarWidth = useMotionValue(180);
	const notesSidebarWidth = useMotionValue(180);

	return (
		<div className="min-h-screen font-display bg-white dark:bg-zinc-800  text-zinc-950 dark:text-zinc-100 flex">
			<FolderSidebar width={folderSidebarWidth} />
		</div>
	);
}
