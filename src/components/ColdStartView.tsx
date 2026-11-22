import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { COLD_START_ACTIONS, type StarterAction } from "../data/catalog";
import {
  DURATION_ENTER,
  DURATION_EXIT,
  EASE_PREMIUM,
  EASE_SHEET_OPEN_CHOREO,
  SHEET_OPEN_CHOREO,
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

const TILE_INDEX_BY_ID: Record<StarterAction["id"], number> = {
  narrow: 0,
  outfit: 1,
  compare: 2,
  gift: 3,
};

export function ColdStartView({
  selectedStarterId,
  sheetOpenStagger = false,
  hiddenForTyping = false,
  alreadyHidden = false,
  onSelectStarter,
}: ColdStartViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const isExitingSelection = selectedStarterId !== null;

  const renderCard = (
    action: StarterAction,
    rowHeightClass: "cold-start-card-tall" | "cold-start-card-short",
  ) => {
    const isSelected = selectedStarterId === action.id;
    const tileTiming = SHEET_OPEN_CHOREO.tiles[TILE_INDEX_BY_ID[action.id]];

    return (
      <motion.button
        key={action.id}
        type="button"
        variants={
          alreadyHidden || sheetOpenStagger ? undefined : blurScaleVariants
        }
        initial={
          alreadyHidden || prefersReducedMotion
            ? false
            : sheetOpenStagger
              ? { opacity: 0, y: 21 }
              : undefined
        }
        animate={
          sheetOpenStagger && !alreadyHidden && !prefersReducedMotion
            ? {
                opacity: 1,
                y: 0,
                transition: {
                  duration: tileTiming.duration,
                  delay: tileTiming.delay,
                  ease: EASE_SHEET_OPEN_CHOREO,
                },
              }
            : undefined
        }
        exit={
          alreadyHidden
            ? { opacity: 0, transition: { duration: 0 } }
            : sheetOpenStagger
              ? {
                  opacity: 0,
                  scale: 0.95,
                  filter: "blur(3px)",
                  y: -8,
                  transition: { duration: DURATION_EXIT, ease: EASE_PREMIUM },
                }
              : undefined
        }
        aria-pressed={isSelected}
        onClick={() => onSelectStarter(action)}
        className={clsx(
          "flex-1 min-w-0 p-12 rounded-tile border flex flex-col items-start justify-between gap-8 text-left text-ink-inverse press-scale motion-reduce:transition-none will-change-transform",
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
        <span className="text-body tracking-xs text-balance break-words">
          {action.label}
        </span>
      </motion.button>
    );
  };

  return (
    <Stack className="h-full min-h-0 justify-end cold-start-shell px-20 gap-8 w-full min-w-0 overflow-visible">
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
          initial={
            prefersReducedMotion
              ? { opacity: 1 }
              : sheetOpenStagger
                ? { opacity: 0, y: 40, filter: "blur(12px)" }
                : { opacity: 0, scale: 0.94, filter: "blur(4px)", y: 12 }
          }
          animate={{
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            y: 0,
            transition: prefersReducedMotion
              ? { duration: 0 }
              : sheetOpenStagger
                ? {
                    opacity: {
                      ...SHEET_OPEN_CHOREO.headline.opacity,
                      ease: EASE_SHEET_OPEN_CHOREO,
                    },
                    y: {
                      ...SHEET_OPEN_CHOREO.headline.y,
                      ease: EASE_SHEET_OPEN_CHOREO,
                    },
                    filter: {
                      ...SHEET_OPEN_CHOREO.headline.filter,
                      ease: EASE_SHEET_OPEN_CHOREO,
                    },
                    scale: { duration: 0 },
                  }
                : {
                    duration: DURATION_ENTER,
                    delay: 0.05,
                    ease: EASE_PREMIUM,
                  },
            transitionEnd: {
              filter: "none",
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
          className="cold-start-heading px-10 w-full text-center will-change-transform"
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
        className="w-full min-w-0 overflow-visible will-change-transform"
      >
        {sheetOpenStagger ? (
          <Box className="w-full min-w-0 overflow-visible">
            <Box className="flex flex-row gap-10 w-full mb-10 items-stretch">
              {ROW_ONE_ACTIONS.map((action) =>
                renderCard(action, "cold-start-card-tall"),
              )}
            </Box>
            <Box className="flex flex-row gap-10 w-full items-stretch">
              {ROW_TWO_ACTIONS.map((action) =>
                renderCard(action, "cold-start-card-short"),
              )}
            </Box>
          </Box>
        ) : (
          <motion.div
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.075,
                  delayChildren: 0.11,
                },
              },
              exit: alreadyHidden
                ? { opacity: 0, transition: { duration: 0 } }
                : staggerGridVariants.exit,
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full min-w-0 overflow-visible"
          >
            <Box className="flex flex-row gap-10 w-full mb-10 items-stretch">
              {ROW_ONE_ACTIONS.map((action) =>
                renderCard(action, "cold-start-card-tall"),
              )}
            </Box>
            <Box className="flex flex-row gap-10 w-full items-stretch">
              {ROW_TWO_ACTIONS.map((action) =>
                renderCard(action, "cold-start-card-short"),
              )}
            </Box>
          </motion.div>
        )}
      </motion.div>
    </Stack>
  );
}
