import { useSpring } from "framer-motion";
import { FolderSidebar } from "./components/folder-sidebar";
import { NotesSidebar } from "./routes/notes-sidebar";
import { Route } from "wouter";

function App() {
	const folderSidebarWidth = useSpring(160, {
		damping: 15,
		stiffness: 100,
		mass: 1,
	});

	const notesSidebarWidth = useSpring(160, {
		damping: 15,
		stiffness: 100,
		mass: 1,
	});

	return (
		<main
			id="App"
			className="min-h-screen font-display bg-white dark:bg-zinc-800  text-zinc-950 dark:text-zinc-100 flex"
		>
			<FolderSidebar folderSidebarWidth={folderSidebarWidth} />

			<Route path="/:folder">
				{(params) => (
					<NotesSidebar
						params={params}
						folderSidebarWidth={folderSidebarWidth}
						notesSidebarWidth={notesSidebarWidth}
					/>
				)}
			</Route>

			{/* <div className="flex-1">
				<Titlebar />
			</div> */}

			{/* <Switch>
				<Route path="/test" component={Test} />
			</Switch> */}
			{/* <NotesEditor /> */}
		</main>
	);
}

export default App;
