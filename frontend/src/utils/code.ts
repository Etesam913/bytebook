export const codeDropdownItems = [
	{
		label: "Javascript",
		value: "javascript",
	},
	{ label: "Python", value: "python" },
	{ label: "Java", value: "java" },
	{ label: "C#", value: "c#" },
	{ label: "C++", value: "c++" },
	{ label: "C", value: "c" },
	{ label: "SQL", value: "sql" },
	{ label: "Go", value: "go" },
];

export const languageToCommandMap: Record<string, string> = {
	javascript: "node",
	python: "python",
	java: "java",
	"c#": "csc",
	"c++": "g++",
	c: "gcc",
	sql: "sql",
	go: "go run",
};
