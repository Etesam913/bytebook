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
};
