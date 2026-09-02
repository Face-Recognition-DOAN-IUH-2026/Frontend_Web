"use client";

import { useReducedMotion, type Variants, type Transition } from "framer-motion";

/**
 * 60fps.design Shared Motion Tokens
 * Standardized easing curves, spring physics, and variants for smooth composite-layer animations.
 */

// 1. Standard Easing Curves (Cubic Bezier)
export const EASINGS = {
  // Ultra-smooth deceleration (optimal for entering modals, popovers, dropdowns)
  smoothOut: [0.16, 1, 0.3, 1] as const,
  // Snappy spring-like curve for micro-interactions
  springSnappy: [0.34, 1.56, 0.64, 1] as const,
  // Natural curve for bottom sheets and drawer slides
  sheet: [0.32, 0.72, 0, 1] as const,
  // Standard ease-in-out for subtle color or opacity fades
  easeInOut: [0.4, 0, 0.2, 1] as const,
  // Sharp exit curve for quickly dismissing dialogs
  sharpExit: [0.4, 0, 1, 1] as const,
};

// 2. Spring Physics Configurations
export const SPRINGS = {
  // Micro-interactions (Button tap, Icon click, Like toggle)
  snappy: {
    type: "spring",
    stiffness: 450,
    damping: 28,
    mass: 0.8,
  } satisfies Transition,

  // Gentle, organic movement (Cards, Popovers, Modals)
  gentle: {
    type: "spring",
    stiffness: 280,
    damping: 24,
    mass: 1,
  } satisfies Transition,

  // Playful, bouncy feedback (Badges, Success checkmarks, Notifications)
  bouncy: {
    type: "spring",
    stiffness: 500,
    damping: 15,
    mass: 0.6,
  } satisfies Transition,

  // Heavy, damped movement (Drawers, Full-screen sheets)
  sheet: {
    type: "spring",
    stiffness: 220,
    damping: 28,
    mass: 1.2,
  } satisfies Transition,
};

// 3. Durations (in seconds for Framer Motion)
export const DURATIONS = {
  instant: 0.1,
  fast: 0.18,
  normal: 0.28,
  smooth: 0.38,
  deliberate: 0.5,
};

// 4. Framer Motion Variants
export const MOTION_VARIANTS: Record<string, Variants> = {
  // Fade in with slight lift
  fadeInUp: {
    initial: { opacity: 0, y: 12 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATIONS.normal, ease: EASINGS.smoothOut },
    },
    exit: {
      opacity: 0,
      y: 8,
      transition: { duration: DURATIONS.fast, ease: EASINGS.sharpExit },
    },
  },

  // Modal / Dialog Pop-up
  modalDialog: {
    initial: { opacity: 0, scale: 0.94, y: 8 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: DURATIONS.normal, ease: EASINGS.smoothOut },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      y: 4,
      transition: { duration: DURATIONS.fast, ease: EASINGS.sharpExit },
    },
  },

  // Staggered Container for Lists & Grids
  staggerContainer: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.02,
      },
    },
  },

  // Stagger Item (used inside staggerContainer)
  staggerItem: {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATIONS.smooth, ease: EASINGS.smoothOut },
    },
    exit: {
      opacity: 0,
      y: 10,
      transition: { duration: DURATIONS.fast },
    },
  },

  // Drawer / Side Panel
  drawerSlideRight: {
    initial: { x: "100%", opacity: 0.5 },
    animate: {
      x: 0,
      opacity: 1,
      transition: SPRINGS.sheet,
    },
    exit: {
      x: "100%",
      opacity: 0,
      transition: { duration: DURATIONS.fast, ease: EASINGS.sharpExit },
    },
  },

  // Success Pop for Status Icons / Badges
  successPop: {
    initial: { scale: 0.6, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: SPRINGS.bouncy,
    },
  },
};

/**
 * Hook to get reduced-motion safe transitions
 */
export function useMotionPreference() {
  const shouldReduceMotion = useReducedMotion();

  return {
    shouldReduceMotion: Boolean(shouldReduceMotion),
    getTransition: (standardTransition: Transition): Transition => {
      if (shouldReduceMotion) {
        return { duration: 0 };
      }
      return standardTransition;
    },
  };
}
