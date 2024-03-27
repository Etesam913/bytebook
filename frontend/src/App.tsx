import { useMotionValue } from "framer-motion";
import { Toaster } from "sonner";
import { Route } from "wouter";
import { FolderSidebar } from "./components/folder-sidebar";
import { NotesSidebar } from "./routes/notes-sidebar";
import {
	useDarkModeSetting,
	useImageDrop,
} from "./utils/hooks";
import { useAtomValue } from "jotai";
import { isNoteMaximizedAtom } from "./atoms";

function App() {
	const folderSidebarWidth = useMotionValue(180);
	const notesSidebarWidth = useMotionValue(180);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	useDarkModeSetting();
	useImageDrop();

	return (
		<main
			id="App"
			className="max-h-screen font-display text-zinc-950 dark:text-zinc-100 flex"
		>
			<Toaster richColors theme="system" />
			{!isNoteMaximized && <FolderSidebar width={folderSidebarWidth} />}
			<Route path="/:folder/:note?">
				{(folderParams) => (
					<NotesSidebar
						params={folderParams}
						width={notesSidebarWidth}
						leftWidth={folderSidebarWidth}
					/>
				)}
			</Route>
		</main>
	);
}

export default App;
