import { useAtomValue } from "jotai";
import { NotesEditor } from "../../components/editor";
import { FILE_SERVER_URL } from "../../utils/misc";
import { draggedElementAtom } from "../../atoms";
import { cn } from "../../utils/string-formatting";
import { FileBan } from "../../icons/file-ban";
import { IMAGE_FILE_EXTENSIONS } from "../../types";

export function RenderNote({
	folder,
	note,
	fileExtension,
}: {
	folder: string;
	note: string | undefined;
	fileExtension: string | undefined;
}) {
	const draggedElement = useAtomValue(draggedElementAtom);

	if (!note) return <></>;
	if (fileExtension === "md") {
		return <NotesEditor params={{ folder, note }} />;
	}
	if (fileExtension === "pdf") {
		return (
			<div className="flex-1 overflow-auto">
				<iframe
					title={note}
					className={cn(
						"h-full w-full",
						draggedElement !== null && "pointer-events-none",
					)}
					src={`${FILE_SERVER_URL}/notes/${folder}/${note}.${fileExtension}`}
				/>
			</div>
		);
	}

	if (fileExtension && IMAGE_FILE_EXTENSIONS.includes(fileExtension)) {
		return (
			<img
				className="flex-1 overflow-auto w-full h-full object-contain my-auto mr-1.5"
				alt={note}
				title={note}
				src={`${FILE_SERVER_URL}/notes/${folder}/${note}.${fileExtension}`}
			/>
		);
	}

	// Unknown file attachment
	return (
		<section className="flex-1 flex flex-col items-center justify-center text-center px-3 pb-16 gap-3">
			<FileBan width="3rem" height="3rem" />
			<h1 className="text-2xl font-bold">This file type is not supported.</h1>
		</section>
	);
}
