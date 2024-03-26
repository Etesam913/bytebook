export function getDefaultButtonVariants(
  disabled = false,
  whileHover = 1.075,
  whileTap = 0.965,
  whileFocus = 1.075,
) {
  if (disabled) {
    return {};
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
