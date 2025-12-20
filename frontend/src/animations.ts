import type { Easing } from 'motion/react';

export function getDefaultButtonVariants(params?: {
  disabled?: boolean;
  whileHover?: number;
  whileTap?: number;
  whileFocus?: number;
}) {
  const {
    disabled = false,
    whileHover = 1.075,
    whileTap = 0.965,
    whileFocus = 1.075,
  } = params ?? {};
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

export const easingFunctions: Record<string, Easing> = {
  'ease-in-quad': [0.55, 0.085, 0.68, 0.53],
  'ease-in-cubic': [0.55, 0.055, 0.675, 0.19],
  'ease-in-quart': [0.895, 0.03, 0.685, 0.22],
  'ease-in-quint': [0.755, 0.05, 0.855, 0.06],
  'ease-in-expo': [0.95, 0.05, 0.795, 0.035],
  'ease-in-circ': [0.6, 0.04, 0.98, 0.335],

  'ease-out-quad': [0.25, 0.46, 0.45, 0.94],
  'ease-out-cubic': [0.215, 0.61, 0.355, 1],
  'ease-out-quart': [0.165, 0.84, 0.44, 1],
  'ease-out-quint': [0.23, 1, 0.32, 1],
  'ease-out-expo': [0.19, 1, 0.22, 1],
  'ease-out-circ': [0.075, 0.82, 0.165, 1],

  'ease-in-out-quad': [0.455, 0.03, 0.515, 0.955],
  'ease-in-out-cubic': [0.645, 0.045, 0.355, 1],
  'ease-in-out-quart': [0.77, 0, 0.175, 1],
  'ease-in-out-quint': [0.86, 0, 0.07, 1],
  'ease-in-out-expo': [1, 0, 0, 1],
  'ease-in-out-circ': [0.785, 0.135, 0.15, 0.86],
};
