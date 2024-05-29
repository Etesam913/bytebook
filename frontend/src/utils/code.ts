import { SandpackFiles } from "@codesandbox/sandpack-react";

export const codeDropdownItems = [
	{
		label: "Javascript",
		value: "javascript",
	},
	{ label: "Python", value: "python" },
	{ label: "Java", value: "java" },
	{ label: "C", value: "c" },
	{ label: "SQL", value: "sql" },
	{ label: "Go", value: "go" },
];

export const codeLanguages = new Set([
	"javascript",
	"python",
	"java",
	"go",
	"react",
	"vue",
	"svelte",
	"angular",
]);

export const languageToCommandMap: Record<string, string> = {
	python: "python",
	java: "java",
	go: "go run",
	rust: "cargo run"
};


type templates = "vanilla" | "angular" | "react" | "vue" | "svelte";

export const languageToTemplate: Record<string, templates> = {
	javascript: "vanilla",
	angular: "angular",
	react: "react",
	vue: "vue",
	svelte: "svelte",
};

export const nonTemplateLanguageToExtension: Record<string, string> = {
	python: "py",
	go: "go",
	java: "java",
	rust: "rs",
};

export const nonTemplateLanguageDefaultFiles: Record<string, SandpackFiles> = {
	python: { "main.py": { code: "print('hello world')\n\n\n", active: true } },
	go: {
		"main.go": {
			code: `package main\n\nimport "fmt"\n\nfunc main(){\n  fmt.Println("nice")\n}`,
			active: true,
		},
	},
	java: {
		"main.java": {
			code: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
			active: true,
		},
	},
	rust: {
		"main.rs": {
			code: `fn main() {\n    println!("Hello, world!");\n}`,
			active: true,
		},
	}
};
