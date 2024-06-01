import { useMotionValue } from "framer-motion";
import { useAtomValue } from "jotai";
import { Toaster } from "sonner";
import { Link, Route, Switch } from "wouter";
import { getDefaultButtonVariants } from "./animations";
import { isNoteMaximizedAtom } from "./atoms";
import { MotionIconButton } from "./components/buttons";
import { NewDialog } from "./components/dialog/new-dialog";
import { FolderSidebar } from "./components/folder-sidebar";
import { CircleArrowLeft } from "./icons/circle-arrow-left";
import { NotFound } from "./routes/not-found";
import { NotesSidebar } from "./routes/notes-sidebar";
import { TrashSidebar } from "./routes/trash-sidebar";
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
			<NewDialog />
			<Toaster richColors theme="system" />

			{!isNoteMaximized && <FolderSidebar width={folderSidebarWidth} />}
			<Switch>
				<Route path="/trash/:item?">
					<TrashSidebar
						width={notesSidebarWidth}
						leftWidth={folderSidebarWidth}
					/>
				</Route>
				<Route path="/settings">
					<div className="px-2 pt-12 pb-2">
						<header className="flex gap-1 items-center">
							<Link to="/">
								<MotionIconButton
									{...getDefaultButtonVariants()}
									title="Go Back"
									onClick={() => window.history.back()}
								>
									<CircleArrowLeft title="Go Back" />
								</MotionIconButton>
							</Link>
							settings
						</header>
					</div>
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
