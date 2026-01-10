import type { Transition, Variants } from 'motion/react'

// Spring presets for consistent, natural feel
export const springs = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  gentle: { type: 'spring', stiffness: 200, damping: 25 } as Transition,
  bouncy: { type: 'spring', stiffness: 300, damping: 20 } as Transition,
}

// Fade in from bottom (for lists, buttons)
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
}

// Fade in with scale (for modals, cards)
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

// Slide up from bottom (for bottom sheets)
export const slideUp: Variants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
}

// Simple fade (for backdrops, overlays)
export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

// Slide in from right (for toasts)
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
}

// Container that staggers children
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

// List item variant for staggered lists
export const listItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10, height: 0 },
}
