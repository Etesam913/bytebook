type ValidatedProjectSettings = {
	darkMode: "light" | "dark" | "system";
	noteSidebarItemSize: "list" | "card";
};

export function validateProjectSettings(settings: {
	darkMode: string;
	noteSidebarItemSize: string;
}): ValidatedProjectSettings {
	const darkModeOptions = ["light", "dark", "system"] as const;
	const sidebarSizeOptions = ["list", "card"] as const;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const darkMode = darkModeOptions.includes(settings.darkMode as any)
		? (settings.darkMode as "light" | "dark" | "system")
		: "system";

	const noteSidebarItemSize = sidebarSizeOptions.includes(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		settings.noteSidebarItemSize as any,
	)
		? (settings.noteSidebarItemSize as "list" | "card")
		: "card";

	return {
		darkMode,
		noteSidebarItemSize,
	};
}
