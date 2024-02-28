export function getDefaultButtonVariants(
	disabled = false,
	whileHover = 1.025,
	whileTap = 0.965,
	whileFocus = 1.025,
) {
	if (disabled){
		return {}
	}
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
