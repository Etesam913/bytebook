import { NotesEditor } from "./components/editor";
import { Sidebar } from "./components/sidebar";
import { Titlebar } from "./components/titlebar";
// import { Greet } from "../wailsjs/go/main/App";
import { Switch, Route, Link } from "wouter";
import { Test } from "./routes/test";

function App() {
	return (
		<main
			id="App"
			className="min-h-screen font-display bg-white dark:bg-zinc-800  text-zinc-950 dark:text-zinc-100 flex"
		>
			{/* <Titlebar /> */}
			<Sidebar />
			<div className="!w-2 cursor-ew-resize" />
			<div className="border-l-[1px] border-l-zinc-200 dark:border-l-zinc-700 flex-1">
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
