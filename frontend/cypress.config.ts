import { defineConfig } from "cypress";

export default defineConfig({
	e2e: {
		baseUrl: "http://localhost:34115",
		screenshotOnRunFailure: false,
	},
});
