import { FolderSidebar } from "./components/folder-sidebar";
import { NotesSidebar } from "./routes/notes-sidebar";
import { Route } from "wouter";

function App() {
	return (
		<main
			id="App"
			className="min-h-screen font-display bg-white dark:bg-zinc-800  text-zinc-950 dark:text-zinc-100 flex"
		>
			<FolderSidebar />

			<Route path="/:folder" component={NotesSidebar} />

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
