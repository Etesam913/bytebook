import { useMotionValue } from "framer-motion";
import { Route } from "wouter";
import { FolderSidebar } from "./components/folder-sidebar";
import { NotesSidebar } from "./routes/notes-sidebar";
import { Toaster } from "sonner";

function App() {
	const folderSidebarWidth = useMotionValue(180);
	const notesSidebarWidth = useMotionValue(180);

	return (
		<main
			id="App"
			className="max-h-screen font-display bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 flex"
		>
			<Toaster richColors />
			<FolderSidebar width={folderSidebarWidth} />
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
