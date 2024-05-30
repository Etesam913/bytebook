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
]);

export const languageToCommandMap: Record<string, string> = {
	python: "python",
	java: "java",
	go: "go run",
	rust: "cargo run",
	cpp: "./main",
};
