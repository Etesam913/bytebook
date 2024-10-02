import { useMotionValue } from "framer-motion";
import { useAtomValue } from "jotai";
import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import { isNoteMaximizedAtom } from "./atoms";
import { Dialog } from "./components/dialog";
import { FolderSidebar } from "./components/folder-sidebar";
import { LoadingModal } from "./components/loading-modal";
import { SearchPanel } from "./components/search-panel";
import { useLoggedInEvent, useUserData } from "./hooks/auth";
import { useNoteSelectionClear } from "./hooks/note-events";
import { useProjectSettings } from "./hooks/project-settings";
import { useSearchPanel } from "./hooks/search";
import { NotFound } from "./routes/not-found";
import { NotesSidebar } from "./routes/notes-sidebar";
import { TrashSidebar } from "./routes/trash-sidebar";
import { useDarkModeSetting } from "./utils/hooks";
import { MAX_SIDEBAR_WIDTH } from "./utils/misc";

export const WINDOW_ID = `id-${Math.random().toString(16).slice(2)}`;

function App() {
	const folderSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
	const notesSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);

	useUserData();
	useLoggedInEvent();
	useDarkModeSetting();
	useSearchPanel();
	useProjectSettings();
	useNoteSelectionClear();

	return (
		<main
			id="App"
			className="flex max-h-screen font-display text-zinc-950 dark:text-zinc-100 overflow-hidden"
		>
			<Dialog />
			<SearchPanel />
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
