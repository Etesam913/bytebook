/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				display: ["Bricolage Grotesque"],
				code: ["Jetbrains Mono"],
			},
			colors: {
				zinc: {
					150: "rgb(236 236 236)",
					650: "rgb(73 73 83)",
					750: "rgb(53,53,59)",
					850: "rgb(30,30,36)",
				},
			},
		},
	},
	plugins: [],
};
