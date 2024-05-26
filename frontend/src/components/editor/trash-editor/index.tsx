import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { motion } from "framer-motion";
import { cn } from "../../../utils/string-formatting";
import { trashEditorConfig } from "../editor-config";
import { TrashNoteTitle } from "./note-title";

export function TrashEditor({ curFile }: { curFile: string }) {
	return (
		<motion.div
			className={cn(
				"flex min-w-0 flex-1 flex-col leading-7  overflow-y-auto mt-3 py-2 px-3 relative",
			)}
		>
			<LexicalComposer initialConfig={trashEditorConfig}>
				<TrashNoteTitle curFile={curFile} />
				<RichTextPlugin
					placeholder={null}
					contentEditable={<ContentEditable id="content-editable-editor" />}
					ErrorBoundary={LexicalErrorBoundary}
				/>
			</LexicalComposer>
		</motion.div>
	);
}
