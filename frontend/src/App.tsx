import { useMotionValue } from "framer-motion";
import { Route } from "wouter";
import { NotesEditor } from "./components/editor";
import { FolderSidebar } from "./components/folder-sidebar";
import { NotesSidebar } from "./routes/notes-sidebar";

function App() {
	const folderSidebarWidth = useMotionValue(180);
	const notesSidebarWidth = useMotionValue(180);

	return (
		<main
			id="App"
			className="min-h-screen font-display bg-white dark:bg-zinc-800  text-zinc-950 dark:text-zinc-100 flex"
		>
			<FolderSidebar width={folderSidebarWidth} />

			<Route path="/:folder" nest>
				{(folderParams) => (
					<>
						<NotesSidebar
							params={folderParams}
							width={notesSidebarWidth}
							leftWidth={folderSidebarWidth}
						/>
						<Route path="/:note">
							{(noteParams) => (
								<NotesEditor
									folderParams={folderParams}
									noteParams={noteParams}
								/>
							)}
						</Route>
					</>
				)}
			</Route>

			{/* <div className="flex-1">
				<Titlebar />
			</div> */}
		</main>
	);
}

export default App;
