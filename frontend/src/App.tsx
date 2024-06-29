import { useMotionValue } from "framer-motion";
import { useAtomValue } from "jotai";
import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import { isNoteMaximizedAtom } from "./atoms";
import { Dialog } from "./components/dialog";
import { FolderSidebar } from "./components/folder-sidebar";
import { LoadingModal } from "./components/loading-modal";
import { NotFound } from "./routes/not-found";
import { NotesSidebar } from "./routes/notes-sidebar";
import { TrashSidebar } from "./routes/trash-sidebar";
import { useDarkModeSetting } from "./utils/hooks";

export const WINDOW_ID = `id-${Math.random().toString(16).slice(2)}`;

function App() {
	const folderSidebarWidth = useMotionValue(190);
	const notesSidebarWidth = useMotionValue(190);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

	useDarkModeSetting();

	return (
		<main
			id="App"
			className="flex max-h-screen font-display text-zinc-950 dark:text-zinc-100"
		>
			<Dialog />
			<LoadingModal />
			<Toaster richColors theme="system" />

			{!isNoteMaximized && <FolderSidebar width={folderSidebarWidth} />}
			<Switch>
				<Route path="/trash/:item?">
					<TrashSidebar
						width={notesSidebarWidth}
						leftWidth={folderSidebarWidth}
					/>
				</Route>
				{/* <Route path="/settings/:option?">
					{(settingsParams) => <SettingsPage params={settingsParams} />}
				</Route> */}
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
