import type { Transition, Variants } from "motion/react";

/**
 * Primary luxury cubic-bezier curve:
 * smooth initial acceleration with an expressive 800ms settling tail and zero bounce.
 */
export const EASE_PREMIUM: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Weighted drawer curve for bottom-sheet glides.
 */
export const EASE_SHEET: [number, number, number, number] = [0.19, 1, 0.22, 1];

export const DURATION_ENTER = 0.8;
export const DURATION_EXIT = 0.56;
export const EXIT_SETTLE_MS = 580;
export const COLD_START_EXIT_DURATION = 0.56;
export const COLD_START_SETTLE_MS = 580;
export const RESUME_PILL_DELAY_MS = 260;
export const FOCUSED_TYPING_STAGE_HEIGHT = 14;
export const TYPING_STAGE_SETTLE_MS = 460;

export const TRANSITION_ENTER: Transition = {
  duration: DURATION_ENTER,
  ease: EASE_PREMIUM,
};

export const TRANSITION_EXIT: Transition = {
  duration: DURATION_EXIT,
  ease: EASE_PREMIUM,
};

export const TRANSITION_CRAFT_UPWARD: Transition = {
  duration: 0.8,
  ease: EASE_PREMIUM,
};

export const TRANSITION_SHEET_OPEN: Transition = {
  duration: 0.8,
  ease: EASE_SHEET,
};

export const TRANSITION_SHEET_CLOSE: Transition = {
  duration: 0.64,
  ease: EASE_PREMIUM,
};

export const TRANSITION_SHEET_HEIGHT: Transition = {
  duration: 0.8,
  ease: EASE_PREMIUM,
};

export const TRANSITION_TYPING_ENTER: Transition = {
  duration: 0.34,
  ease: EASE_PREMIUM,
};

export const TRANSITION_TYPING_EXIT: Transition = {
  duration: 0.44,
  ease: EASE_PREMIUM,
};

export const TRANSITION_ORB_GLIDE: Transition = {
  duration: 0.8,
  ease: EASE_PREMIUM,
};

export const TRANSITION_ORB_EXIT: Transition = {
  duration: DURATION_EXIT,
  ease: EASE_PREMIUM,
};

export const TRANSITION_ICON: Transition = {
  duration: 0.5,
  ease: EASE_PREMIUM,
};

export const TRANSITION_PICKER_SCRIM_OPEN: Transition = {
  duration: 0.22,
  ease: EASE_PREMIUM,
};

export const TRANSITION_PICKER_OPEN: Transition = {
  duration: 0.28,
  ease: EASE_PREMIUM,
};

export const TRANSITION_PICKER_CLOSE: Transition = {
  duration: 0.18,
  ease: EASE_PREMIUM,
};

export const TRANSITION_COMPARE_SWAP_IN: Transition = {
  duration: 0.26,
  ease: EASE_PREMIUM,
};

export const TRANSITION_COMPARE_SWAP_OUT: Transition = {
  duration: 0.18,
  ease: EASE_PREMIUM,
};

/**
 * Synchronized subtle blur + opacity + scale entry and exit used on every UI element.
 * Blur stays a quiet optical detail (4px in, 3px out) rather than the main character.
 */
export const blurScaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.94,
    filter: "blur(4px)",
    y: 12,
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    y: 0,
    transition: TRANSITION_ENTER,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    filter: "blur(3px)",
    y: -8,
    transition: TRANSITION_EXIT,
  },
};

export const upwardCraftedBubbleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    filter: "blur(4px)",
    y: 36,
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    y: 0,
    transition: TRANSITION_CRAFT_UPWARD,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    filter: "blur(3px)",
    y: -8,
    transition: TRANSITION_EXIT,
  },
};

export const staggerGridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.075,
      delayChildren: 0.24,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const staggerAnswerSequenceVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    filter: "blur(3px)",
    scale: 0.95,
    y: -8,
    transition: TRANSITION_EXIT,
  },
};

export const staggerCardsVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    filter: "blur(3px)",
    scale: 0.95,
    transition: TRANSITION_EXIT,
  },
};

export const contextualIconVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.25,
    filter: "blur(3px)",
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: TRANSITION_ICON,
  },
  exit: {
    opacity: 0,
    scale: 0.25,
    filter: "blur(3px)",
    transition: { duration: 0.36, ease: EASE_PREMIUM },
  },
};

export const resumePillAnnounceVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    filter: "blur(4px)",
    y: 18,
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      duration: 0.72,
      ease: EASE_PREMIUM,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    filter: "blur(3px)",
    y: 10,
    transition: {
      duration: 0.44,
      ease: EASE_PREMIUM,
    },
  },
};

export const resumeSparkleAnnounceVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.25,
    rotate: -26,
    filter: "blur(2px)",
  },
  visible: {
    opacity: 1,
    scale: [0.25, 1.2, 1],
    rotate: [-26, 10, 0],
    filter: "blur(0px)",
    transition: {
      duration: 0.68,
      delay: 0.1,
      ease: EASE_PREMIUM,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.4,
    filter: "blur(2px)",
    transition: { duration: 0.28, ease: EASE_PREMIUM },
  },
};

export const scrollCueAnnounceVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.86,
    filter: "blur(4px)",
    y: 12,
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      duration: 0.68,
      delay: 0.18,
      ease: EASE_PREMIUM,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    filter: "blur(3px)",
    y: 8,
    transition: {
      duration: 0.4,
      ease: EASE_PREMIUM,
    },
  },
};

export const announceAfterModalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.97,
    filter: "blur(4px)",
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      duration: 0.28,
      ease: EASE_PREMIUM,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    filter: "blur(4px)",
    y: -4,
    transition: TRANSITION_COMPARE_SWAP_OUT,
  },
};

export const pickerGridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.025,
      delayChildren: 0,
    },
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    pointerEvents: "none",
    transition: {
      duration: 0.14,
      ease: EASE_PREMIUM,
    },
  },
};

export const pickerCardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.97,
    filter: "blur(4px)",
    y: 6,
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      duration: 0.24,
      ease: EASE_PREMIUM,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    filter: "blur(4px)",
    transition: {
      duration: 0.14,
      ease: EASE_PREMIUM,
    },
  },
};

export const compareSlotRowVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    scale: 0.97,
    transition: TRANSITION_COMPARE_SWAP_OUT,
  },
};

export const compareSlotItemVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.97,
    filter: "blur(4px)",
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    y: 0,
    transition: {
      duration: 0.3,
      ease: EASE_PREMIUM,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    filter: "blur(4px)",
    transition: TRANSITION_COMPARE_SWAP_OUT,
  },
};

export const compareSlotSwapVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: TRANSITION_COMPARE_SWAP_IN,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    filter: "blur(4px)",
    pointerEvents: "none",
    transition: TRANSITION_COMPARE_SWAP_OUT,
  },
};
