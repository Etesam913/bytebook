import { TrashEditor } from "../../components/editor/trash-editor";

import type { AnimationControls } from "framer-motion";
import { NotesEditor } from "../../components/editor";

export function MarkdownNote({
	isInTrash,
	folder,
	note,
	fileExtension,
	animationControls,
}: {
	isInTrash: boolean;
	folder: string;
	note: string;
	fileExtension: string;
	animationControls: AnimationControls;
}) {
	if (isInTrash) {
		return <TrashEditor curFile={`${note}.${fileExtension}`} />;
	}
	return (
		<>
			<NotesEditor
				params={{ folder, note }}
				animationControls={animationControls}
			/>
		</>
	);
}
