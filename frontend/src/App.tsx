import { useMotionValue } from "framer-motion";
import { Toaster } from "sonner";
import { Route } from "wouter";
import { FolderSidebar } from "./components/folder-sidebar";
import { NotesSidebar } from "./routes/notes-sidebar";
import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { darkModeAtom } from "./atoms";

function App() {
	const folderSidebarWidth = useMotionValue(180);
	const notesSidebarWidth = useMotionValue(180);
	const setDarkMode = useSetAtom(darkModeAtom);

	useEffect(() => {
		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", (event) =>
				event.matches ? setDarkMode(true) : setDarkMode(false),
			);
		return () => {
			window
				.matchMedia("(prefers-color-scheme: dark)")
				.removeEventListener("change", (event) =>
					event.matches ? setDarkMode(true) : setDarkMode(false),
				);
		};
	}, [setDarkMode]);

	return (
		<main
			id="App"
			className="max-h-screen font-display text-zinc-950 dark:text-zinc-100 flex"
		>
			<Toaster richColors theme="system" />
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
