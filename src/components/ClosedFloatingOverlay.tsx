import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import type { ContentSpotMode } from "../data/catalog";
import {
  EASE_PREMIUM,
  RESUME_PILL_DELAY_MS,
  blurScaleVariants,
  resumePillAnnounceVariants,
  resumeSparkleAnnounceVariants,
} from "../motion/presets";
import { Box, Cluster, Layer, Stack } from "../primitives/Layout";

export interface ClosedFloatingOverlayProps {
  visible: boolean;
  showResumePill: boolean;
  contentSpotMode: ContentSpotMode;
  contentSpotDismissed: boolean;
  scenarioSelectorDismissed?: boolean;
  hideScenarioSelector?: boolean;
  onSelectSpotMode: (mode: ContentSpotMode) => void;
  onDismissScenarioSelector?: () => void;
  onResumeChat: () => void;
  onScrollTop: () => void;
  onOpenFreshChat: () => void;
}

const closedOverlayVariants: Variants = {
  hidden: blurScaleVariants.hidden,
  visible: blurScaleVariants.visible,
  exit: {
    opacity: 0,
    filter: "blur(3px)",
    scale: 0.96,
    y: 10,
    transition: { duration: 0.42, ease: EASE_PREMIUM },
  },
};

export function ClosedFloatingOverlay({
  visible,
  showResumePill,
  contentSpotMode,
  contentSpotDismissed,
  scenarioSelectorDismissed = false,
  hideScenarioSelector = false,
  onSelectSpotMode,
  onDismissScenarioSelector,
  onResumeChat,
  onScrollTop,
  onOpenFreshChat,
}: ClosedFloatingOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const [pillAnnounceReady, setPillAnnounceReady] = useState(false);

  useEffect(() => {
    if (!visible || !showResumePill) {
      setPillAnnounceReady(false);
      return;
    }

    if (prefersReducedMotion) {
      setPillAnnounceReady(true);
      return;
    }

    const timerId = window.setTimeout(() => {
      setPillAnnounceReady(true);
    }, RESUME_PILL_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [visible, showResumePill, prefersReducedMotion]);

  const shouldRenderResumePill = showResumePill && pillAnnounceReady;

  return (
    <Box
      inert={!visible || undefined}
      className="w-full min-w-0 flex flex-col justify-end pointer-events-none"
    >
      <AnimatePresence mode="wait" initial={false}>
        {visible ? (
          <motion.div
            key="closed-floating-overlay"
            inert={!visible || undefined}
            variants={prefersReducedMotion ? undefined : closedOverlayVariants}
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
            exit={
              prefersReducedMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : "exit"
            }
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
            className="stack-cell self-end z-20 pointer-events-none w-full min-w-0 pb-safe-overlay flex flex-col"
          >
            <Box className="flex flex-row items-end justify-between gap-8 w-full min-w-0 px-12">
              {/* Left slot keeps FABs pinned right whether resume pill is shown, exiting, or hidden */}
              <Box className="flex items-end min-w-0">
                <AnimatePresence mode="wait">
                  {shouldRenderResumePill ? (
                    <motion.div
                      key="resume-chat-pill"
                      role="region"
                      aria-label="Resume Coach AI chat"
                      variants={
                        prefersReducedMotion
                          ? undefined
                          : resumePillAnnounceVariants
                      }
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0, transition: { duration: 0 } }
                          : "exit"
                      }
                      transition={prefersReducedMotion ? { duration: 0 } : undefined}
                      className="stack-grid shrink-0 isolate pointer-events-none"
                    >
                      {/* Subtle directional stroke caustic cast into the pill's shadow footprint */}
                      <Layer
                        aria-hidden="true"
                        className="z-0 rounded-pill resume-ai-glow pointer-events-none"
                      />

                      <Layer
                        as="button"
                        type="button"
                        onClick={onResumeChat}
                        className={clsx(
                          visible ? "pointer-events-auto" : "pointer-events-none",
                          "z-10 self-center justify-self-center resume-ai-pill rounded-pill shadow-resume-pill press-scale motion-reduce:transition-none",
                        )}
                      >
                        <Cluster
                          as="span"
                          className="h-37 pl-13 pr-15 bg-surface rounded-pill gap-6"
                        >
                          <motion.img
                            variants={
                              prefersReducedMotion
                                ? undefined
                                : resumeSparkleAnnounceVariants
                            }
                            src="/assets/figma/sparkle-black.svg"
                            alt=""
                            width={16}
                            height={16}
                            className="w-16 h-16 shrink-0"
                          />
                          <span className="text-caption text-ink tracking-xs pt-1 whitespace-nowrap">
                            Coach AI
                          </span>
                        </Cluster>
                      </Layer>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </Box>

              <Stack
                className={clsx(
                  visible ? "pointer-events-auto" : "pointer-events-none",
                  "gap-16 items-center",
                )}
              >
                <button
                  type="button"
                  onClick={onOpenFreshChat}
                  className="w-40 h-40 rounded-pill bg-surface shadow-fab flex items-center justify-center press-scale motion-reduce:transition-none"
                >
                  <img
                    src="/assets/figma/icon-fab-chat.svg"
                    alt="Open Coach AI"
                    width={22}
                    height={20}
                    className="w-22 h-20"
                  />
                </button>

                <button
                  type="button"
                  onClick={onScrollTop}
                  className="w-40 h-40 rounded-pill bg-surface shadow-fab flex items-center justify-center press-scale motion-reduce:transition-none"
                >
                  <img
                    src="/assets/figma/icon-fab-up.svg"
                    alt="Back to top"
                    width={16}
                    height={16}
                    className="w-16 h-16"
                  />
                </button>
              </Stack>
            </Box>

            {!hideScenarioSelector && (
              <Box
                className={clsx(
                  "disclosure-grid w-full min-w-0 motion-reduce:transition-none",
                  scenarioSelectorDismissed
                    ? "disclosure-closed"
                    : "disclosure-open",
                )}
              >
                <Box
                  inert={scenarioSelectorDismissed || undefined}
                  className="overflow-hidden min-h-0 w-full min-w-0"
                >
                  <Box className="pt-10 px-12 flex justify-center w-full min-w-0">
                    <Cluster
                      as="nav"
                      aria-label="Entry scenario selector"
                      className={clsx(
                        visible && !scenarioSelectorDismissed
                          ? "pointer-events-auto"
                          : "pointer-events-none",
                        "min-w-0 max-w-full bg-surface-selector backdrop-blur-md border border-border-dock rounded-pill p-4 gap-3 shadow-fab",
                      )}
                    >
                      <Cluster className="min-w-0 overflow-x-auto no-scrollbar gap-3">
                        <button
                          type="button"
                          aria-pressed={
                            contentSpotMode === "general" && !contentSpotDismissed
                          }
                          onClick={() => onSelectSpotMode("general")}
                          className={clsx(
                            "h-32 px-9 shrink-0 rounded-pill text-caption tracking-xs whitespace-nowrap press-scale motion-reduce:transition-none",
                            contentSpotMode === "general" && !contentSpotDismissed
                              ? "bg-surface text-ink font-medium"
                              : "text-ink-inverse-soft hover:text-ink-inverse",
                          )}
                        >
                          General Copy
                        </button>

                        <button
                          type="button"
                          aria-pressed={
                            contentSpotMode === "prompted" && !contentSpotDismissed
                          }
                          onClick={() => onSelectSpotMode("prompted")}
                          className={clsx(
                            "h-32 px-9 shrink-0 rounded-pill text-caption tracking-xs whitespace-nowrap press-scale motion-reduce:transition-none",
                            contentSpotMode === "prompted" && !contentSpotDismissed
                              ? "bg-surface text-ink font-medium"
                              : "text-ink-inverse-soft hover:text-ink-inverse",
                          )}
                        >
                          Prompted Ad
                        </button>

                        <button
                          type="button"
                          aria-pressed={
                            contentSpotMode === "compare" && !contentSpotDismissed
                          }
                          onClick={() => onSelectSpotMode("compare")}
                          className={clsx(
                            "h-32 px-9 shrink-0 rounded-pill text-caption tracking-xs whitespace-nowrap press-scale motion-reduce:transition-none",
                            contentSpotMode === "compare" && !contentSpotDismissed
                              ? "bg-surface text-ink font-medium"
                              : "text-ink-inverse-soft hover:text-ink-inverse",
                          )}
                        >
                          Compare Prompt
                        </button>
                      </Cluster>

                      <Box
                        aria-hidden="true"
                        className="w-1 h-16 bg-border-divider shrink-0"
                      />

                      <button
                        type="button"
                        onClick={onDismissScenarioSelector}
                        aria-label="Dismiss scenario selector"
                        className="size-32 shrink-0 rounded-pill flex items-center justify-center text-ink-inverse-soft hover:text-ink-inverse hover:bg-surface-tile-hover press-scale motion-reduce:transition-none"
                      >
                        <img
                          src="/assets/figma/icon-close-sheet.svg"
                          alt=""
                          width={16}
                          height={16}
                          className="size-16 shrink-0 opacity-80"
                        />
                      </button>
                    </Cluster>
                  </Box>
                </Box>
              </Box>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Box>
  );
}
