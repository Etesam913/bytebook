import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";

/** @type {import('eslint').Linter.Config} */
export default defineConfig([
	globalIgnores(["node_modules/", "bindings/", "dist/", "build/"]),
	{
		files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
		settings: {
			react: {
				// Using "detect" is recommended as it automatically determines the version
				version: "detect",
			},
		},
		languageOptions: { globals: globals.browser },
		extends: [
			pluginJs.configs.recommended,
			...tseslint.configs.recommended,
			pluginReact.configs.flat.recommended,
		],
		rules: {
			// Disable the rule that requires React to be in scope for JSX
			"react/react-in-jsx-scope": "off",
		},
	},
]);
