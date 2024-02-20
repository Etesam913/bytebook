export function getDefaultButtonVariants(
	whileHover = 1.025,
	whileTap = 0.965,
	whileFocus = 1.025,
) {
	return {
		whileHover: {
			scale: whileHover,
		},
		whileTap: {
			scale: whileTap,
		},
		whileFocus: {
			scale: whileFocus,
		},
	};
}
