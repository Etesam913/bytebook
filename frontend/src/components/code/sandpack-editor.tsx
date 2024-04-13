import {
	SandpackProvider,
	SandpackCodeEditor,
	SandpackLayout,
	SandpackPreview,
	SandpackFileExplorer,
} from "@codesandbox/sandpack-react";

import { useAtomValue } from "jotai";
import { darkModeAtom } from "../../atoms";
import { CodeViewer } from "./code-viewer";

export function SandpackEditor() {
	const isDarkModeOn = useAtomValue(darkModeAtom);

	return (
		<SandpackProvider
			theme={isDarkModeOn ? "dark" : "light"}
			files={{ "main.py": { code: "print('hello world')", active: true } }}
			template={undefined}
		>
			<SandpackLayout>
				<SandpackFileExplorer />
				<CodeViewer />
			</SandpackLayout>
			<SandpackLayout>
				<SandpackPreview showNavigator showOpenInCodeSandbox={false} />
			</SandpackLayout>
		</SandpackProvider>
	);
}
