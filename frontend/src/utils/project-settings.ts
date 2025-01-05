type ValidatedProjectSettings = {
	darkMode: "light" | "dark" | "system";
	noteSidebarItemSize: "compact" | "regular";
};

export function validateProjectSettings(settings: {
	darkMode: string;
	noteSidebarItemSize: string;
}): ValidatedProjectSettings {
	const darkModeOptions = ["light", "dark", "system"] as const;
	const sidebarSizeOptions = ["compact", "regular"] as const;

	// biome-ignore lint/suspicious/noExplicitAny: This is fine for proejct settings type validation
	const darkMode = darkModeOptions.includes(settings.darkMode as any)
		? (settings.darkMode as "light" | "dark" | "system")
		: "system";

	const noteSidebarItemSize = sidebarSizeOptions.includes(
		// biome-ignore lint/suspicious/noExplicitAny: This is fine for proejct settings type validation
		settings.noteSidebarItemSize as any,
	)
		? (settings.noteSidebarItemSize as "compact" | "regular")
		: "regular";

	return {
		darkMode,
		noteSidebarItemSize,
	};
}
