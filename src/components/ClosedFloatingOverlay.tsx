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
  onSelectSpotMode: (mode: ContentSpotMode) => void;
  onResumeChat: () => void;
  onDismissResumePill: () => void;
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
  onSelectSpotMode,
  onResumeChat,
  onDismissResumePill,
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
      className="w-full flex flex-col justify-end pointer-events-none"
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
            className="stack-cell self-end z-20 pointer-events-none w-full pb-safe-overlay px-12 flex flex-col gap-10"
          >
            <Box className="flex flex-row items-end justify-between w-full">
              {/* Left slot keeps FABs pinned right whether resume pill is shown, exiting, or hidden */}
              <Box className="flex items-end">
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
                      className="stack-grid isolate pointer-events-none"
                    >
                      {/* Subtle directional stroke caustic cast into the pill's shadow footprint */}
                      <Layer
                        aria-hidden="true"
                        className="z-0 rounded-pill resume-ai-glow pointer-events-none"
                      />

                      <Layer
                        className={clsx(
                          visible ? "pointer-events-auto" : "pointer-events-none",
                          "z-10 self-center justify-self-center resume-ai-pill rounded-pill shadow-resume-pill",
                        )}
                      >
                        <Box className="bg-surface rounded-pill pr-5 flex flex-row items-center">
                          <button
                            type="button"
                            onClick={onResumeChat}
                            className="min-h-52 pl-14 pr-4 py-9 rounded-l-pill flex flex-row items-center gap-6 press-scale motion-reduce:transition-none text-left"
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
                              Resume your chat
                              <br />
                              with Coach AI
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={onDismissResumePill}
                            className="w-36 h-36 rounded-pill flex items-center justify-center shrink-0 press-scale motion-reduce:transition-none"
                          >
                            <img
                              src="/assets/figma/icon-close-pill.svg"
                              alt="Dismiss resume chat"
                              width={20}
                              height={20}
                              className="w-20 h-20"
                            />
                          </button>
                        </Box>
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

            <Box className="flex justify-center w-full">
              <Cluster
                as="nav"
                aria-label="Entry scenario selector"
                className={clsx(
                  visible ? "pointer-events-auto" : "pointer-events-none",
                  "bg-surface-selector backdrop-blur-md border border-border-dock rounded-pill p-4 gap-4 shadow-fab",
                )}
              >
                <button
                  type="button"
                  aria-pressed={contentSpotMode === "general" && !contentSpotDismissed}
                  onClick={() => onSelectSpotMode("general")}
                  className={clsx(
                    "h-32 px-14 rounded-pill text-caption tracking-xs whitespace-nowrap press-scale motion-reduce:transition-none",
                    contentSpotMode === "general" && !contentSpotDismissed
                      ? "bg-surface text-ink font-medium"
                      : "text-ink-inverse-soft hover:text-ink-inverse",
                  )}
                >
                  General Copy
                </button>

                <button
                  type="button"
                  aria-pressed={contentSpotMode === "prompted" && !contentSpotDismissed}
                  onClick={() => onSelectSpotMode("prompted")}
                  className={clsx(
                    "h-32 px-14 rounded-pill text-caption tracking-xs whitespace-nowrap press-scale motion-reduce:transition-none",
                    contentSpotMode === "prompted" && !contentSpotDismissed
                      ? "bg-surface text-ink font-medium"
                      : "text-ink-inverse-soft hover:text-ink-inverse",
                  )}
                >
                  Prompted Ad
                </button>
              </Cluster>
            </Box>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Box>
  );
}
