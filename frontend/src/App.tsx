import { useMotionValue } from "framer-motion";
import { useAtomValue } from "jotai";
import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import { isNoteMaximizedAtom } from "./atoms";
import { FolderSidebar } from "./components/folder-sidebar";
import { NotFound } from "./routes/not-found";
import { NotesSidebar } from "./routes/notes-sidebar";
import { useDarkModeSetting, useImageDrop } from "./utils/hooks";

export const WINDOW_ID = `id-${Math.random().toString(16).slice(2)}`;

function App() {
	const folderSidebarWidth = useMotionValue(190);
	const notesSidebarWidth = useMotionValue(190);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

	useDarkModeSetting();
	useImageDrop();

	return (
		<main
			id="App"
			className="flex max-h-screen font-display text-zinc-950 dark:text-zinc-100"
		>
			<Toaster richColors theme="system" />

			{!isNoteMaximized && <FolderSidebar width={folderSidebarWidth} />}
			<Switch>
				<Route path="/not-found">
					<NotFound />
				</Route>
				<Route path="/:folder/:note?">
					{(folderParams) => (
						<NotesSidebar
							params={folderParams}
							width={notesSidebarWidth}
							leftWidth={folderSidebarWidth}
						/>
					)}
				</Route>
			</Switch>
		</main>
	);
}

export default App;
