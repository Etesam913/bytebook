import { python } from "@codemirror/lang-python";
import { useSandpack, SandpackCodeEditor } from "@codesandbox/sandpack-react";
import { useEffect } from "react";
export function CodeViewer() {
	const { sandpack, listen } = useSandpack();
	const { deleteFile, files } = sandpack;
	// }, [listen]);

	// clear all default files
	useEffect(() => {
		const filePaths = Object.keys(files);
		for (const filePath of filePaths) {
			if (!filePath.endsWith(".py")) {
				deleteFile(filePath);
			}
		}
	}, [deleteFile]);

	return (
		<SandpackCodeEditor
			showTabs
			showLineNumbers={false}
			showInlineErrors
			wrapContent
			closableTabs
			additionalLanguages={[
				{
					name: "python",
					extensions: ["py"],
					language: python(),
				},
			]}
		/>
	);
}
