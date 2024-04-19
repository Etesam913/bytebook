import { useMotionValue } from "framer-motion";
import { useAtomValue } from "jotai";
import { Toaster } from "sonner";
import { Route } from "wouter";
import { isNoteMaximizedAtom } from "./atoms";
import { FolderSidebar } from "./components/folder-sidebar";
import { NotesSidebar } from "./routes/notes-sidebar";
import {
	useDarkModeSetting,
	useImageDrop,
	useIsStandalone,
} from "./utils/hooks";

export const AppId = "id" + Math.random().toString(16).slice(2);

function App() {
	const folderSidebarWidth = useMotionValue(190);
	const notesSidebarWidth = useMotionValue(190);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

	useDarkModeSetting();
	useImageDrop();
	const isStandalone = useIsStandalone();

	return (
		<main
			id="App"
			className="flex max-h-screen font-display text-zinc-950 dark:text-zinc-100"
		>
			<Toaster richColors theme="system" />
			{!isNoteMaximized && !isStandalone && (
				<FolderSidebar width={folderSidebarWidth} />
			)}
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
