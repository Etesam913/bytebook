export const codeLanguages = new Set([
	"javascript",
	"python",
	"java",
	"go",
	"react",
	"vue",
	"svelte",
	"angular",
	"rust",
	"cpp",
	"terminal",
]);

export const languageToCommandMap: Record<string, string> = {
	python: "python main.py",
	java: "java main.java",
	go: "go run main.go",
	rust: "cargo run main.rs",
	cpp: "./main",
};
