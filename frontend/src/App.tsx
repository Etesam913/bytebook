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
import { useProjectSettings } from "./hooks/project-settings";
import { useSearchPanel } from "./hooks/search";
import { useTags } from "./hooks/tag-events";
import { useDarkModeSetting } from "./hooks/theme";
import { NotFound } from "./routes/not-found";
import { NotesSidebar } from "./routes/notes-sidebar";
import { TagsSidebar } from "./routes/tags-sidebar";
import { MAX_SIDEBAR_WIDTH } from "./utils/general";

export const WINDOW_ID = `id-${Math.random().toString(16).slice(2)}`;

function App() {
	const folderSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
	const notesSidebarWidth = useMotionValue(MAX_SIDEBAR_WIDTH);
	const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
	const setContextMenuData = useSetAtom(contextMenuDataAtom);

	useUserData();
	useTags();
	useLoggedInEvent();
	useDarkModeSetting();
	useSearchPanel();
	useProjectSettings();

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
				<Route path="/" />
				<Route path="/tags/:tagName/:folder?/:note?">
					{(folderParams) => (
						<TagsSidebar
							params={folderParams}
							width={notesSidebarWidth}
							leftWidth={folderSidebarWidth}
						/>
					)}
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
				<Route path="*">
					<NotFound />
				</Route>
			</Switch>
		</main>
	);
}

export default App;
