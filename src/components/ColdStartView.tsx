import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { COLD_START_ACTIONS, type StarterAction } from "../data/catalog";
import {
  DURATION_ENTER,
  DURATION_EXIT,
  EASE_PREMIUM,
  blurScaleVariants,
  staggerGridVariants,
} from "../motion/presets";
import { Box, Stack } from "../primitives/Layout";

export interface ColdStartViewProps {
  selectedStarterId: StarterAction["id"] | null;
  sheetOpenStagger?: boolean;
  hiddenForTyping?: boolean;
  alreadyHidden?: boolean;
  onSelectStarter: (action: StarterAction) => void;
}

const ROW_ONE_ACTIONS = COLD_START_ACTIONS.filter((action) => action.row === 1);
const ROW_TWO_ACTIONS = COLD_START_ACTIONS.filter((action) => action.row === 2);

export function ColdStartView({
  selectedStarterId,
  sheetOpenStagger = false,
  hiddenForTyping = false,
  alreadyHidden = false,
  onSelectStarter,
}: ColdStartViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const isExitingSelection = selectedStarterId !== null;

  const renderCard = (action: StarterAction, rowHeightClass: "h-107" | "h-91") => {
    const isSelected = selectedStarterId === action.id;

    return (
      <motion.button
        key={action.id}
        type="button"
        variants={alreadyHidden ? undefined : blurScaleVariants}
        aria-pressed={isSelected}
        onClick={() => onSelectStarter(action)}
        className={clsx(
          "flex-1 min-w-0 p-13 rounded-tile border flex flex-col items-start justify-between text-left text-ink-inverse press-scale motion-reduce:transition-none",
          rowHeightClass,
          isExitingSelection && "pointer-events-none",
          isSelected
            ? "bg-surface-tile-hover border-surface"
            : "bg-surface-tile hover:bg-surface-tile-hover border-border-glass"
        )}
      >
        <img
          src={action.icon}
          alt=""
          width={22}
          height={22}
          className="w-22 h-22 shrink-0"
        />
        <span className="text-body tracking-xs text-balance">
          {action.label}
        </span>
      </motion.button>
    );
  };

  return (
    <Stack className="h-full justify-end pb-48 px-20 gap-10 w-full overflow-visible">
      <motion.div
        initial={false}
        animate={
          prefersReducedMotion
            ? { opacity: hiddenForTyping ? 0 : 1 }
            : hiddenForTyping
              ? { opacity: 0, scale: 0.97, y: -6 }
              : { opacity: 1, scale: 1, y: 0 }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : hiddenForTyping
              ? { duration: 0.18, delay: 0.03, ease: EASE_PREMIUM }
              : { duration: 0.32, delay: 0.16, ease: EASE_PREMIUM }
        }
        className="w-full will-change-transform"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, filter: "blur(4px)", y: 12 }}
          animate={{
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            y: 0,
            transition: {
              duration: DURATION_ENTER,
              delay: sheetOpenStagger ? 0.26 : 0.05,
              ease: EASE_PREMIUM,
            },
          }}
          exit={
            alreadyHidden
              ? { opacity: 0, transition: { duration: 0 } }
              : {
                  opacity: 0,
                  scale: 0.95,
                  filter: "blur(3px)",
                  y: -10,
                  transition: { duration: DURATION_EXIT, ease: EASE_PREMIUM },
                }
          }
          className="pt-2 pb-14 px-10 w-full text-center"
        >
          <h2 className="text-heading text-ink-inverse tracking-sm font-normal text-balance m-0">
            How can I help?
          </h2>
        </motion.div>
      </motion.div>

      <motion.div
        initial={false}
        animate={
          prefersReducedMotion
            ? { opacity: hiddenForTyping ? 0 : 1 }
            : hiddenForTyping
              ? { opacity: 0, scale: 0.98, y: -6 }
              : { opacity: 1, scale: 1, y: 0 }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : hiddenForTyping
              ? { duration: 0.17, delay: 0, ease: EASE_PREMIUM }
              : { duration: 0.34, delay: 0.19, ease: EASE_PREMIUM }
        }
        className="w-full overflow-visible will-change-transform"
      >
        <motion.div
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.075,
                delayChildren: sheetOpenStagger ? 0.34 : 0.11,
              },
            },
            exit: alreadyHidden
              ? { opacity: 0, transition: { duration: 0 } }
              : staggerGridVariants.exit,
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="w-full overflow-visible"
        >
          <Box className="flex flex-row gap-10 w-full mb-10">
            {ROW_ONE_ACTIONS.map((action) => renderCard(action, "h-107"))}
          </Box>
          <Box className="flex flex-row gap-10 w-full">
            {ROW_TWO_ACTIONS.map((action) => renderCard(action, "h-91"))}
          </Box>
        </motion.div>
      </motion.div>
    </Stack>
  );
}
