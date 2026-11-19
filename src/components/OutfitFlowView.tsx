import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
} from "motion/react";
import {
  OUTFIT_MATCH_REPLY,
  OUTFIT_SELFIE_PREVIEW,
  OUTFIT_STARTER_PROMPT,
  type BagProduct,
} from "../data/catalog";
import {
  DURATION_ENTER,
  EASE_PREMIUM,
  blurScaleVariants,
  compareSlotItemVariants,
  compareSlotRowVariants,
  compareSlotSwapVariants,
  staggerAnswerSequenceVariants,
  staggerCardsVariants,
  upwardCraftedBubbleVariants,
} from "../motion/presets";
import { Box, Cluster, LayerGrid, Stack } from "../primitives/Layout";

export type OutfitStage =
  | "loading"
  | "exiting-loading"
  | "awaiting-selfie"
  | "matched";

export interface OutfitThreadTurn {
  kind: "outfit";
  id: string;
  userPrompt: string;
  showUserBubble: boolean;
  anchorChoiceGroupKey?: string;
  stage: OutfitStage;
  selfiePicked: boolean;
  selectedOptions: string[];
  feedback: "up" | "down" | null;
}

export interface OutfitTurnItemProps {
  turn: OutfitThreadTurn;
  registerChoiceGroupRef: (key: string, node: HTMLDivElement | null) => void;
  onPickSelfie: (turnId: string) => void;
  onInspectBag?: (bag: BagProduct) => void;
  onSelectOption: (turnId: string, option: string) => void;
  onFeedback: (turnId: string, vote: "up" | "down") => void;
}

export const seenOutfitBubbleTurnIds = new Set<string>();
export const seenOutfitAwaitingTurnIds = new Set<string>();
export const seenOutfitMatchedTurnIds = new Set<string>();

export function resetSeenOutfitTurnIds() {
  seenOutfitBubbleTurnIds.clear();
  seenOutfitAwaitingTurnIds.clear();
  seenOutfitMatchedTurnIds.clear();
}

export function OutfitTurnItem({
  turn,
  registerChoiceGroupRef,
  onPickSelfie,
  onInspectBag,
  onSelectOption,
  onFeedback,
}: OutfitTurnItemProps) {
  const { stage, selfiePicked } = turn;
  const isMatchedReady = stage === "matched" && selfiePicked;

  const bubbleAlreadySeen = seenOutfitBubbleTurnIds.has(turn.id);
  const awaitingAlreadySeen = seenOutfitAwaitingTurnIds.has(turn.id);
  const matchedAlreadySeen = seenOutfitMatchedTurnIds.has(turn.id);

  return (
    <div className="flex flex-col gap-16 w-full overflow-visible">
      {turn.showUserBubble && (
        <motion.div
          ref={(node) => {
            if (node) {
              seenOutfitBubbleTurnIds.add(turn.id);
            }
          }}
          variants={upwardCraftedBubbleVariants}
          initial={bubbleAlreadySeen ? false : "hidden"}
          animate="visible"
          exit="exit"
          className="self-end bg-surface text-ink px-10 py-8 rounded-tl-bubble rounded-bl-bubble rounded-br-bubble rounded-tr-sharp max-w-210 shadow-bubble flex flex-row items-center gap-6"
        >
          {turn.userPrompt === OUTFIT_STARTER_PROMPT && (
            <img
              src="/assets/figma/icon-compare-bubble.svg"
              alt=""
              width={14}
              height={14}
              className="w-14 h-14 shrink-0"
            />
          )}
          <span className="text-caption tracking-xs text-balance">
            {turn.userPrompt}
          </span>
        </motion.div>
      )}

      <AnimatePresence
        mode="wait"
        initial={
          stage === "loading" ? !bubbleAlreadySeen : !awaitingAlreadySeen
        }
      >
        {stage === "exiting-loading" ? null : stage === "loading" ? (
          <motion.div
            key="outfit-stage-loading"
            initial={
              bubbleAlreadySeen
                ? false
                : {
                    opacity: 0,
                    scale: 0.94,
                    filter: "blur(4px)",
                    y: 12,
                  }
            }
            animate={{
              opacity: 1,
              scale: 1,
              filter: "blur(0px)",
              y: 0,
              transition: {
                duration: DURATION_ENTER,
                delay: turn.showUserBubble ? 0.12 : 0,
                ease: EASE_PREMIUM,
              },
            }}
            exit={blurScaleVariants.exit as TargetAndTransition}
            className="self-start flex flex-col gap-8 items-start"
          >
            <span className="text-micro text-ink-inverse">Coach AI</span>
            <Box className="w-212 bg-surface p-8 rounded-bubble shadow-bubble text-caption text-ink tracking-xs">
              Loading tools
            </Box>
            <Box
              role="status"
              aria-label="Loading outfit matching tool"
              className="h-22 px-10 rounded-pill bg-surface shadow-bubble flex flex-row items-center gap-4"
            >
              <span className="size-4 rounded-pill bg-ink animate-dot-1" />
              <span className="size-4 rounded-pill bg-ink animate-dot-2" />
              <span className="size-4 rounded-pill bg-ink animate-dot-3" />
            </Box>
          </motion.div>
        ) : (
          <div
            key="outfit-stage-ready"
            className="flex flex-col gap-20 w-full overflow-visible"
          >
            <motion.div
              ref={(node) => {
                if (node) {
                  seenOutfitAwaitingTurnIds.add(turn.id);
                }
              }}
              variants={staggerAnswerSequenceVariants}
              initial={awaitingAlreadySeen ? false : "hidden"}
              animate="visible"
              className="flex flex-col gap-16 w-full overflow-visible"
            >
              <motion.div
                variants={blurScaleVariants}
                className="self-start flex flex-col gap-5 items-start"
              >
                <span className="text-micro text-ink-inverse">Coach AI</span>
                <Box className="w-296 max-w-full bg-surface p-10 rounded-bubble shadow-bubble text-caption text-ink tracking-xs text-pretty">
                  Pick a selfie or outfit photo below and I’ll match silhouettes,
                  leather tones, and hardware to your look.
                </Box>
              </motion.div>

              <motion.div
                variants={compareSlotRowVariants}
                className="flex flex-row justify-center w-full pt-4"
              >
                <motion.div
                  variants={compareSlotItemVariants}
                  className="w-176 h-236 shrink-0 stack-grid"
                >
                  <AnimatePresence initial={false}>
                    {selfiePicked ? (
                      <motion.div
                        key="picked-selfie"
                        variants={compareSlotSwapVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="stack-cell w-176 h-236 bg-surface rounded-slot overflow-hidden flex flex-col text-left shadow-bubble"
                      >
                        <LayerGrid className="w-176 h-184 bg-surface-portrait overflow-hidden shrink-0 image-outline">
                          <img
                            src={OUTFIT_SELFIE_PREVIEW.image}
                            alt="Selected outfit selfie"
                            className="stack-cell w-176 h-184 object-cover object-top"
                          />
                        </LayerGrid>
                        <Stack className="px-10 py-8 gap-2 bg-surface h-52 w-full justify-center">
                          <Cluster className="gap-4">
                            <img
                              src="/assets/figma/icon-check-black.svg"
                              alt=""
                              width={14}
                              height={14}
                              className="w-14 h-14 shrink-0"
                            />
                            <p className="text-caption text-ink truncate m-0">
                              {OUTFIT_SELFIE_PREVIEW.title}
                            </p>
                          </Cluster>
                          <p className="text-micro text-ink-muted truncate m-0">
                            {OUTFIT_SELFIE_PREVIEW.subtitle}
                          </p>
                        </Stack>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="empty-selfie"
                        type="button"
                        variants={compareSlotSwapVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={() => onPickSelfie(turn.id)}
                        className="stack-cell w-176 h-236 rounded-slot border border-dashed border-border-glass bg-surface-tile/40 hover:bg-surface-tile-hover flex flex-col items-center justify-center gap-16 press-scale motion-reduce:transition-none"
                      >
                        <span className="w-36 h-36 rounded-pill bg-surface flex items-center justify-center shadow-bubble">
                          <img
                            src="/assets/figma/icon-ar-outfit.svg"
                            alt=""
                            width={20}
                            height={20}
                            className="w-20 h-20 invert"
                          />
                        </span>
                        <span className="text-body text-ink-inverse tracking-xs text-center leading-tight">
                          Pick a selfie
                        </span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </motion.div>

            <AnimatePresence initial={!matchedAlreadySeen}>
              {isMatchedReady && (
                <div
                  ref={(node) =>
                    registerChoiceGroupRef(`${turn.id}:results`, node)
                  }
                  className="w-full"
                >
                  <motion.div
                    key="outfit-results"
                    ref={(node) => {
                      if (node) {
                        seenOutfitAwaitingTurnIds.add(turn.id);
                        seenOutfitMatchedTurnIds.add(turn.id);
                      }
                    }}
                    variants={staggerAnswerSequenceVariants}
                    initial={matchedAlreadySeen ? false : "hidden"}
                    animate="visible"
                    exit="exit"
                    className="flex flex-col gap-14 w-full items-start overflow-visible"
                  >
                    <motion.div
                      variants={blurScaleVariants}
                      className="flex flex-col gap-5 items-start"
                    >
                      <span className="text-micro text-ink-inverse">
                        Coach AI
                      </span>
                      <Stack className="w-296 max-w-full bg-surface p-10 rounded-bubble shadow-bubble gap-10">
                        {OUTFIT_MATCH_REPLY.leadParagraphs.map(
                          (paragraph, idx) => (
                            <p
                              key={idx}
                              className="text-caption text-ink tracking-xs text-pretty m-0"
                            >
                              {paragraph}
                            </p>
                          ),
                        )}
                      </Stack>
                    </motion.div>

                    {OUTFIT_MATCH_REPLY.bags &&
                      OUTFIT_MATCH_REPLY.bags.length > 0 && (
                        <motion.div
                          variants={staggerCardsVariants}
                          className="flex flex-row gap-8 w-full overflow-x-auto no-scrollbar py-2"
                        >
                          {OUTFIT_MATCH_REPLY.bags.map((bag) => (
                            <motion.button
                              key={bag.id}
                              type="button"
                              variants={blurScaleVariants}
                              onClick={() => onInspectBag?.(bag)}
                              className="w-132 shrink-0 bg-surface rounded-card overflow-hidden flex flex-col text-left press-scale motion-reduce:transition-none shadow-bubble"
                            >
                              <LayerGrid className="w-full h-176 bg-surface-muted overflow-hidden">
                                <img
                                  src={bag.image}
                                  alt={bag.name}
                                  className="stack-cell w-full h-176 object-cover"
                                />
                                <img
                                  src="/assets/figma/card-plus.svg"
                                  alt=""
                                  width={22}
                                  height={22}
                                  className="stack-cell self-end justify-self-end w-22 h-22 m-2"
                                />
                              </LayerGrid>
                              <img
                                src="/assets/figma/card-slider-bar.svg"
                                alt=""
                                className="w-full h-2 object-cover"
                              />
                              <Stack className="p-10 gap-4 bg-surface w-full">
                                <p className="text-caption text-ink truncate m-0">
                                  {bag.name}
                                </p>
                                <p className="text-caption text-ink tabular-nums m-0">
                                  {bag.priceFormatted}
                                </p>
                              </Stack>
                            </motion.button>
                          ))}
                        </motion.div>
                      )}

                    <motion.div
                      variants={blurScaleVariants}
                      className="flex flex-col gap-12 items-start"
                    >
                      {OUTFIT_MATCH_REPLY.followUpNote && (
                        <Box className="w-296 max-w-full bg-surface p-10 rounded-bubble shadow-bubble text-caption text-ink tracking-xs text-pretty">
                          <p className="m-0">
                            {OUTFIT_MATCH_REPLY.followUpNote}
                          </p>
                        </Box>
                      )}

                      <Cluster className="gap-10 pt-2">
                        <span className="text-micro text-ink-inverse">
                          How was my answer?
                        </span>
                        <Cluster className="gap-4">
                          <button
                            type="button"
                            aria-label="Helpful outfit match"
                            aria-pressed={turn.feedback === "up"}
                            onClick={() => onFeedback(turn.id, "up")}
                            className={clsx(
                              "w-36 h-36 rounded-pill flex items-center justify-center press-scale motion-reduce:transition-none",
                              turn.feedback === "up"
                                ? "bg-surface/25"
                                : "hover:bg-surface/10",
                            )}
                          >
                            <img
                              src="/assets/figma/icon-thumb-up.svg"
                              alt=""
                              width={18}
                              height={18}
                              className="w-18 h-18"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label="Unhelpful outfit match"
                            aria-pressed={turn.feedback === "down"}
                            onClick={() => onFeedback(turn.id, "down")}
                            className={clsx(
                              "w-36 h-36 rounded-pill flex items-center justify-center press-scale motion-reduce:transition-none",
                              turn.feedback === "down"
                                ? "bg-surface/25"
                                : "hover:bg-surface/10",
                            )}
                          >
                            <img
                              src="/assets/figma/icon-thumb-down.svg"
                              alt=""
                              width={18}
                              height={18}
                              className="w-18 h-18"
                            />
                          </button>
                        </Cluster>
                      </Cluster>
                    </motion.div>

                    {OUTFIT_MATCH_REPLY.options &&
                      OUTFIT_MATCH_REPLY.options.length > 0 && (
                        <div
                          ref={(node) =>
                            registerChoiceGroupRef(`${turn.id}:options`, node)
                          }
                          className="w-full"
                        >
                          <motion.div
                            key="outfit-pick-an-option"
                            variants={blurScaleVariants}
                            initial={matchedAlreadySeen ? false : "hidden"}
                            animate="visible"
                            className="w-full flex flex-col items-end gap-8 pt-4"
                          >
                            <span className="text-micro text-ink-inverse">
                              Pick an option
                            </span>
                            <motion.div
                              variants={staggerCardsVariants}
                              className="flex flex-row gap-6 w-full items-stretch"
                            >
                              {OUTFIT_MATCH_REPLY.options.map((opt) => {
                                const isSelected =
                                  turn.selectedOptions.includes(opt);
                                return (
                                  <motion.button
                                    key={opt}
                                    type="button"
                                    variants={blurScaleVariants}
                                    aria-pressed={isSelected}
                                    onClick={() =>
                                      onSelectOption(turn.id, opt)
                                    }
                                    className={clsx(
                                      "flex-1 min-w-0 p-10 min-h-112 rounded-tile border border-border-glass flex flex-col justify-between gap-12 text-left press-scale motion-reduce:transition-none",
                                      isSelected
                                        ? "bg-surface text-ink"
                                        : "bg-surface-tile text-ink-inverse hover:bg-surface-tile-hover",
                                    )}
                                  >
                                    <img
                                      src="/assets/figma/icon-ai-white.svg"
                                      alt=""
                                      width={18}
                                      height={18}
                                      className={clsx(
                                        "w-18 h-18 shrink-0 transition-icon-invert motion-reduce:transition-none",
                                        isSelected && "invert scale-105",
                                      )}
                                    />
                                    <span className="text-caption tracking-xs leading-tight text-pretty break-words">
                                      {opt}
                                    </span>
                                  </motion.button>
                                );
                              })}
                            </motion.div>
                          </motion.div>
                        </div>
                      )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
