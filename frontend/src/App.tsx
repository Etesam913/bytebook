import { Dialog } from "./components/dialog";
import { Sidebar } from "./components/sidebar";
import { Titlebar } from "./components/titlebar";

function App() {
	return (
		<main
			id="App"
			className="min-h-screen font-display bg-white dark:bg-zinc-800  text-zinc-950 dark:text-zinc-100 flex"
		>
			<Sidebar />

			<div className="flex-1">
				<Titlebar />
			</div>
			{/* <Switch>
				<Route path="/test" component={Test} />
			</Switch> */}
			{/* <NotesEditor /> */}
		</main>
	);
}

export default App;
