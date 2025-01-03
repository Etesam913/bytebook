import { useMotionValue } from "framer-motion";
import { useAtomValue, useSetAtom } from "jotai/react";
import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import { contextMenuDataAtom, isNoteMaximizedAtom } from "./atoms";
import { ContextMenu } from "./components/context-menu";
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
import { TagsSidebar } from "./routes/tags-sidebar";
import { useDarkModeSetting } from "./utils/hooks";
import { MAX_SIDEBAR_WIDTH } from "./utils/misc";

export const WINDOW_ID = `id-${Math.random().toString(16).slice(2)}`;

function App() {
	const folderSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
	const notesSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const setContextMenuData = useSetAtom(contextMenuDataAtom);

	useUserData();
	useLoggedInEvent();
	useDarkModeSetting();
	useSearchPanel();
	useProjectSettings();
	useNoteSelectionClear();

	return (
		<main
			id="App"
			className="flex max-h-screen font-display overflow-hidden"
			onClick={(e) => {
				if (!e.ctrlKey) {
					setContextMenuData((prev) => ({ ...prev, isShowing: false }));
				}
			}}
			onContextMenu={(e) => e.preventDefault()}
		>
			<ContextMenu />
			<Dialog />
			<SearchPanel />
			<LoadingModal />
			<Toaster richColors theme="system" />
			{!isNoteMaximized && <FolderSidebar width={folderSidebarWidth} />}
			<Switch>
				<Route path="/tags/:tagName/:folder?/:note?">
					{(folderParams) => (
						<TagsSidebar
							params={folderParams}
							width={notesSidebarWidth}
							leftWidth={folderSidebarWidth}
						/>
					)}
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
