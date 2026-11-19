import type { ReactNode } from "react";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  DURATION_ENTER,
  EASE_PREMIUM,
  TRANSITION_EXIT,
  TRANSITION_SHEET_CLOSE,
  TRANSITION_SHEET_HEIGHT,
  TRANSITION_SHEET_OPEN,
  blurScaleVariants,
} from "../motion/presets";
import { Box, Cluster, Layer, LayerGrid, Stack } from "../primitives/Layout";
import { ChatInputDock } from "./ChatInputDock";

export interface AssistantSheetShellProps {
  open: boolean;
  stageHeight: number;
  staggerChrome?: boolean;
  showNewChat: boolean;
  onNewChat: () => void;
  onClose: () => void;
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
  staggerChrome = true,
  showNewChat,
  onNewChat,
  onClose,
  inputValue,
  onInputChange,
  onSubmitPrompt,
  onVoiceSample,
  modalOverlay,
  children,
}: AssistantSheetShellProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <LayerGrid key="assistant-sheet-shell" className="stack-cell w-full h-full overflow-hidden isolate">
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
            onClick={onClose}
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
            className="stack-cell self-end w-full max-h-full isolate z-10 will-change-transform"
          >
            <LayerGrid className="w-full rounded-t-sheet overflow-hidden bg-surface-sheet isolate">
              {/* Textured champagne-taupe background */}
              <Layer className="w-full h-0 min-h-full pointer-events-none stack-grid grid-rows-1 overflow-hidden z-0">
                <img
                  src="/assets/figma/sheet-bg.png"
                  alt=""
                  className="stack-cell w-full h-full object-cover scale-105"
                />
                <Box className="stack-cell w-full h-full bg-surface-sheet-wash" />
                <Box className="stack-cell w-full h-full sheet-radial-sheen mix-blend-plus-lighter" />
              </Layer>

              {/* Foreground sheet chrome + continuous stage */}
              <Stack className="stack-cell w-full isolate z-10">
                {/* Persistent Header (z-20 above stage, so Orb feather can breathe behind it with ZERO clip line!) */}
                <motion.header
                  initial={
                    prefersReducedMotion || !staggerChrome
                      ? { opacity: 0, filter: "blur(3px)" }
                      : { opacity: 0, filter: "blur(4px)", scale: 0.96, y: 8 }
                  }
                  animate={{ opacity: 1, filter: "blur(0px)", scale: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    filter: "blur(3px)",
                    transition: TRANSITION_EXIT,
                  }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : {
                          duration: DURATION_ENTER,
                          delay: staggerChrome ? 0.1 : 0.05,
                          ease: EASE_PREMIUM,
                        }
                  }
                  className="px-16 py-16 flex flex-row items-center justify-between w-full shrink-0 z-20"
                >
                  <Cluster className="gap-6 py-4 px-4">
                    <img
                      src="/assets/figma/sparkle-white.svg"
                      alt=""
                      width={18}
                      height={18}
                      className="w-18 h-18 shrink-0"
                    />
                    <Box
                      as="span"
                      className="text-body text-ink-inverse tracking-xs pt-1 whitespace-nowrap"
                    >
                      Ask Coach AI
                    </Box>
                  </Cluster>

                  <Cluster className="gap-10">
                    <AnimatePresence
                      mode="wait"
                      initial={staggerChrome ? undefined : false}
                    >
                      {showNewChat && (
                        <motion.button
                          key="new-chat-cta"
                          type="button"
                          variants={blurScaleVariants}
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
                          onClick={onNewChat}
                          className="bg-surface text-ink h-36 px-12 py-6 rounded-pill flex flex-row items-center gap-4 press-scale motion-reduce:transition-none"
                        >
                          <img
                            src="/assets/figma/icon-add-newchat.svg"
                            alt=""
                            width={18}
                            height={18}
                            className="w-18 h-18 shrink-0"
                          />
                          <Box
                            as="span"
                            className="text-caption text-ink tracking-xs pt-1 whitespace-nowrap"
                          >
                            New Chat
                          </Box>
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <Box
                      as="button"
                      type="button"
                      onClick={onClose}
                      aria-label="Close Ask Coach AI"
                      className="w-36 h-36 rounded-pill bg-surface flex items-center justify-center press-scale motion-reduce:transition-none"
                    >
                      <img
                        src="/assets/figma/icon-close-sheet.svg"
                        alt=""
                        width={20}
                        height={20}
                        className="w-20 h-20"
                      />
                    </Box>
                  </Cluster>
                </motion.header>

                {/* Stage container uses overflow-visible so Orb glow/blur NEVER clips horizontally */}
                <motion.div
                  initial={{ height: stageHeight }}
                  animate={{ height: stageHeight }}
                  transition={prefersReducedMotion ? { duration: 0 } : TRANSITION_SHEET_HEIGHT}
                  className="w-full overflow-visible z-10"
                >
                  {children}
                </motion.div>

                {/* Persistent Input Dock (z-20) */}
                <motion.div
                  initial={
                    prefersReducedMotion || !staggerChrome
                      ? { opacity: 0, filter: "blur(3px)" }
                      : { opacity: 0, filter: "blur(4px)", scale: 0.97, y: 14 }
                  }
                  animate={{ opacity: 1, filter: "blur(0px)", scale: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    filter: "blur(3px)",
                    transition: TRANSITION_EXIT,
                  }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : {
                          duration: DURATION_ENTER,
                          delay: staggerChrome ? 0.2 : 0.08,
                          ease: EASE_PREMIUM,
                        }
                  }
                  className="w-full z-20"
                >
                  <ChatInputDock
                    value={inputValue}
                    onChange={onInputChange}
                    onSubmit={onSubmitPrompt}
                    onVoiceSample={onVoiceSample}
                  />
                </motion.div>
              </Stack>

              {/* Modal Overlay Layer (Choosing product A / B) */}
              <Layer
                className={clsx(
                  "w-full h-full stack-grid isolate z-30",
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
