import { useEffect, useState, type ReactNode, type RefObject } from "react";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  DURATION_ENTER,
  DURATION_EXIT,
  EASE_PREMIUM,
  EASE_SHEET_OPEN_CHOREO,
  EASE_SHEET_OPEN_SOFT,
  SHEET_OPEN_CHOREO,
  TRANSITION_EXIT,
  TRANSITION_SHEET_CLOSE,
  TRANSITION_SHEET_HEIGHT,
  TRANSITION_SHEET_OPEN,
  TRANSITION_TYPING_ENTER,
  TRANSITION_TYPING_EXIT,
  TRANSITION_TYPING_SUBMIT_EXPAND,
  TYPING_STAGE_SETTLE_MS,
  blurScaleVariants,
} from "../motion/presets";
import { Box, Cluster, Layer, LayerGrid, Stack } from "../primitives/Layout";
import { ChatInputDock } from "./ChatInputDock";

const newChatCtaVariants = {
  hidden: blurScaleVariants.hidden,
  visible: blurScaleVariants.visible,
  exit: (exitingForTyping: boolean) =>
    exitingForTyping
      ? {
          opacity: 0,
          scale: 0.94,
          y: -4,
          transition: {
            duration: 0.18,
            ease: EASE_PREMIUM,
          },
        }
      : {
          opacity: 0,
          scale: 0.95,
          filter: "blur(3px)",
          y: -8,
          transition: {
            duration: DURATION_EXIT,
            ease: EASE_PREMIUM,
          },
        },
};

export interface AssistantSheetShellProps {
  open: boolean;
  stageHeight: number;
  isTypingFocused?: boolean;
  isExpandingFromSubmit?: boolean;
  staggerChrome?: boolean;
  showNewChat: boolean;
  onNewChat: () => void;
  onClose: () => void;
  onTypingFocusChange?: (focused: boolean) => void;
  onDismissTyping?: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  inputValue: string;
  onInputChange: (val: string) => void;
  onSubmitPrompt: (prompt: string) => void;
  onVoiceSample: () => void;
  modalOverlay?: ReactNode;
  children: ReactNode;
}

export function AssistantSheetShell({
  open,
  stageHeight,
  isTypingFocused = false,
  isExpandingFromSubmit = false,
  staggerChrome = true,
  showNewChat,
  onNewChat,
  onClose,
  onTypingFocusChange,
  onDismissTyping,
  inputRef,
  inputValue,
  onInputChange,
  onSubmitPrompt,
  onVoiceSample,
  modalOverlay,
  children,
}: AssistantSheetShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isStageSettling, setIsStageSettling] = useState(false);
  const [hasActiveThread, setHasActiveThread] = useState(showNewChat);

  useEffect(() => {
    if (!isTypingFocused) {
      setHasActiveThread(showNewChat);
    }
  }, [isTypingFocused, showNewChat]);

  useEffect(() => {
    if (isTypingFocused) {
      setIsStageSettling(true);
      return;
    }

    if (prefersReducedMotion) {
      setIsStageSettling(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsStageSettling(false);
    }, TYPING_STAGE_SETTLE_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isExpandingFromSubmit, isTypingFocused, prefersReducedMotion]);

  const shouldClipStage = isTypingFocused || isStageSettling || isExpandingFromSubmit;

  const stageHeightTransition = prefersReducedMotion
    ? { duration: 0 }
    : isTypingFocused
      ? TRANSITION_TYPING_ENTER
      : isExpandingFromSubmit
        ? TRANSITION_TYPING_SUBMIT_EXPAND
        : isStageSettling
          ? TRANSITION_TYPING_EXIT
          : TRANSITION_SHEET_HEIGHT;

  const handleScrimClick = () => {
    if (isTypingFocused && onDismissTyping) {
      onDismissTyping();
      return;
    }
    onClose();
  };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <LayerGrid key="assistant-sheet-shell" className="stack-cell w-full h-full grid-rows-1 overflow-hidden isolate">
          {/* Softly dimming backdrop scrim (800ms enter, 640ms exit) */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: prefersReducedMotion ? { duration: 0 } : TRANSITION_SHEET_CLOSE,
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: DURATION_ENTER, ease: EASE_PREMIUM }
            }
            onClick={handleScrimClick}
            aria-hidden="true"
            className="stack-cell w-full h-full bg-surface-scrim backdrop-blur-subtle z-0"
          />

          {/* Velvety 800ms bottom sheet rise & subtle blur+opacity+glide exit */}
          <motion.section
            aria-label="Ask Coach AI"
            initial={
              prefersReducedMotion
                ? { y: "0%", opacity: 1 }
                : { y: "100%", opacity: 0.96 }
            }
            animate={{ y: "0%", opacity: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : {
                    y: "104%",
                    opacity: 0,
                    filter: "blur(3px)",
                    transition: TRANSITION_SHEET_CLOSE,
                  }
            }
            transition={prefersReducedMotion ? { duration: 0 } : TRANSITION_SHEET_OPEN}
            className="stack-cell self-end w-full max-h-full min-w-0 flex flex-col isolate z-10 will-change-transform"
          >
            <LayerGrid className="w-full max-h-full min-h-0 rounded-t-sheet overflow-hidden bg-surface-sheet isolate">
              {/* Textured champagne-taupe background */}
              <Layer className="w-full h-0 min-h-full pointer-events-none stack-grid grid-rows-1 overflow-hidden z-0">
                <img
                  src="/assets/figma/sheet-bg.png"
                  alt=""
                  className="stack-cell z-0 w-full h-full object-cover scale-110"
                />
                <Box className="stack-cell z-10 w-full h-full sheet-radial-sheen mix-blend-plus-lighter" />
                {/* z-20: scale/blend on siblings create stacking contexts that otherwise bury this 40% black wash */}
                <Box className="stack-cell z-20 w-full h-full bg-surface-sheet-wash" />
              </Layer>

              {/* Foreground sheet chrome + continuous stage */}
              <Stack className="stack-cell w-full max-h-full min-h-0 min-w-0 isolate z-10">
                {/* Persistent Header — brand fade + close spin from Figma 2176:34661 */}
                <header className="pl-10 pr-14 py-20 flex flex-row items-center justify-between gap-8 w-full min-w-0 shrink-0 z-20">
                  <motion.div
                    initial={
                      prefersReducedMotion
                        ? { opacity: 1 }
                        : staggerChrome
                          ? { opacity: 0 }
                          : { opacity: 0, filter: "blur(3px)" }
                    }
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{
                      opacity: 0,
                      filter: "blur(3px)",
                      transition: TRANSITION_EXIT,
                    }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : staggerChrome
                          ? {
                              duration: SHEET_OPEN_CHOREO.brand.duration,
                              delay: SHEET_OPEN_CHOREO.brand.delay,
                              ease: EASE_SHEET_OPEN_SOFT,
                            }
                          : {
                              duration: DURATION_ENTER,
                              delay: 0.05,
                              ease: EASE_PREMIUM,
                            }
                    }
                    className="min-w-0"
                  >
                    <Cluster className="gap-5">
                      <img
                        src="/assets/figma/sparkle-white.svg"
                        alt=""
                        width={20}
                        height={20}
                        className="w-20 h-20 shrink-0"
                      />
                      <Box
                        as="span"
                        className="text-body text-ink-inverse tracking-xs pt-3 whitespace-nowrap"
                      >
                        Ask Coach AI
                      </Box>
                    </Cluster>
                  </motion.div>

                  <Cluster className="gap-10 h-21 shrink-0">
                    <AnimatePresence
                      mode="wait"
                      custom={isTypingFocused}
                      initial={staggerChrome ? undefined : false}
                    >
                      {showNewChat && (
                        <motion.div
                          key="new-chat-cta"
                          variants={newChatCtaVariants}
                          custom={isTypingFocused}
                          initial={prefersReducedMotion ? false : "hidden"}
                          animate={
                            prefersReducedMotion
                              ? { opacity: 1 }
                              : {
                                  opacity: 1,
                                  scale: 1,
                                  filter: "blur(0px)",
                                  y: 0,
                                  transition: {
                                    duration: DURATION_ENTER,
                                    delay: staggerChrome ? 0.24 : 0.12,
                                    ease: EASE_PREMIUM,
                                  },
                                }
                          }
                          exit="exit"
                          className="flex flex-row items-center gap-10"
                        >
                          <Box
                            as="button"
                            type="button"
                            onClick={onNewChat}
                            className="text-ink-inverse h-32 px-10 py-6 rounded-pill flex flex-row items-center gap-2 press-scale motion-reduce:transition-none"
                          >
                            <Box
                              as="span"
                              className="w-18 h-18 flex items-center justify-center shrink-0"
                            >
                              <img
                                src="/assets/figma/icon-edit-newchat.svg"
                                alt=""
                                className="max-w-none shrink-0"
                              />
                            </Box>
                            <Box
                              as="span"
                              className="text-caption text-ink-inverse tracking-xs pt-3 whitespace-nowrap"
                            >
                              New Chat
                            </Box>
                          </Box>

                          <Box
                            as="span"
                            aria-hidden="true"
                            className="w-px h-18 bg-surface opacity-50 shrink-0"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      initial={
                        prefersReducedMotion
                          ? { opacity: 1, rotate: 0, scale: 1 }
                          : staggerChrome
                            ? { opacity: 0, rotate: -90, scale: 0.8 }
                            : { opacity: 0, scale: 0.94 }
                      }
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{
                        opacity: 0,
                        transition: TRANSITION_EXIT,
                      }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : staggerChrome
                            ? {
                                opacity: {
                                  ...SHEET_OPEN_CHOREO.close.opacity,
                                  ease: EASE_SHEET_OPEN_CHOREO,
                                },
                                rotate: {
                                  ...SHEET_OPEN_CHOREO.close.rotate,
                                  ease: EASE_SHEET_OPEN_CHOREO,
                                },
                                scale: {
                                  ...SHEET_OPEN_CHOREO.close.scale,
                                  ease: EASE_SHEET_OPEN_SOFT,
                                },
                              }
                            : {
                                duration: DURATION_ENTER,
                                delay: 0.05,
                                ease: EASE_PREMIUM,
                              }
                      }
                      // design-system-escape: motion rotate/scale needs explicit transform-origin pivot
                      style={{ transformOrigin: "50% 50%" }}
                      className="shrink-0 will-change-transform"
                    >
                      <Box
                        as="button"
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleScrimClick}
                        aria-label={
                          isTypingFocused
                            ? "Dismiss keyboard"
                            : "Close Ask Coach AI"
                        }
                        className="p-6 rounded-pill flex items-center justify-center shrink-0 press-scale motion-reduce:transition-none"
                      >
                        <img
                          src="/assets/figma/icon-close-sheet.svg"
                          alt=""
                          className="shrink-0"
                        />
                      </Box>
                    </motion.div>
                  </Cluster>
                </header>

                {/* Stage container clips cleanly at dock edge while collapsing/expanding for Focused Typing View, keeping top Orb glow unclipped */}
                <motion.div
                  initial={{ height: stageHeight }}
                  animate={{ height: stageHeight }}
                  transition={stageHeightTransition}
                  inert={isTypingFocused || undefined}
                  className={clsx(
                    "w-full min-w-0 min-h-0 shrink z-10 overflow-visible",
                    shouldClipStage && "clip-stage-bottom",
                    isTypingFocused && "pointer-events-none",
                  )}
                >
                  <div className="w-full h-stage-content max-h-full min-w-0 min-h-0 overflow-visible">
                    {children}
                  </div>
                </motion.div>

                {/* Persistent Input Dock — rises + unblurs late in the open choreography */}
                <motion.div
                  initial={
                    prefersReducedMotion
                      ? { opacity: 1, y: 0, filter: "blur(0px)" }
                      : staggerChrome
                        ? { y: 135, filter: "blur(12px)" }
                        : { opacity: 0, filter: "blur(3px)", y: 14 }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transitionEnd: { filter: "none" },
                  }}
                  exit={{
                    opacity: 0,
                    filter: "blur(3px)",
                    transition: TRANSITION_EXIT,
                  }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : staggerChrome
                        ? {
                            y: {
                              ...SHEET_OPEN_CHOREO.dock.y,
                              ease: EASE_SHEET_OPEN_CHOREO,
                            },
                            filter: {
                              ...SHEET_OPEN_CHOREO.dock.filter,
                              ease: EASE_SHEET_OPEN_SOFT,
                            },
                            opacity: { duration: 0 },
                          }
                        : {
                            duration: DURATION_ENTER,
                            delay: 0.08,
                            ease: EASE_PREMIUM,
                          }
                  }
                  className="w-full min-w-0 shrink-0 z-20 will-change-transform"
                >
                  <ChatInputDock
                    inputRef={inputRef}
                    value={inputValue}
                    onChange={onInputChange}
                    onSubmit={onSubmitPrompt}
                    onVoiceSample={onVoiceSample}
                    focused={isTypingFocused}
                    isFollowUp={showNewChat || hasActiveThread}
                    onFocusChange={onTypingFocusChange}
                  />
                </motion.div>
              </Stack>

              {/* Modal Overlay Layer (Choosing product A / B) */}
              <Layer
                className={clsx(
                  "w-full h-0 min-h-full stack-grid grid-rows-1 overflow-hidden isolate z-30",
                  modalOverlay ? "pointer-events-auto" : "pointer-events-none"
                )}
              >
                <AnimatePresence>{modalOverlay}</AnimatePresence>
              </Layer>
            </LayerGrid>
          </motion.section>
        </LayerGrid>
      )}
    </AnimatePresence>
  );
}
