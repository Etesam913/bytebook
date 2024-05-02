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
					650: "rgb(68 68 77)",
					750: "rgb(53,53,59)",
				},
			},
		},
	},
	plugins: [],
};
