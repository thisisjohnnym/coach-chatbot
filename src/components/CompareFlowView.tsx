import { useEffect, useRef } from "react";
import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
} from "motion/react";
import type { BagProduct } from "../data/catalog";
import {
  DURATION_ENTER,
  EASE_PREMIUM,
  announceAfterModalVariants,
  blurScaleVariants,
  compareSlotItemVariants,
  compareSlotRowVariants,
  compareSlotSwapVariants,
  staggerAnswerSequenceVariants,
  staggerCardsVariants,
  upwardCraftedBubbleVariants,
} from "../motion/presets";
import { Box, Cluster, LayerGrid, Stack } from "../primitives/Layout";

export type CompareStage =
  | "loading"
  | "exiting-loading"
  | "selecting"
  | "compared";

export type CompareConfirmOption = "compare-choices" | "something-else";
export type CompareFollowUpOption = "compare-features" | "something-else";

export interface CompareThreadTurn {
  kind: "compare";
  id: string;
  userPrompt: string;
  showUserBubble: boolean;
  showCompareIcon?: boolean;
  prefilledFromRecent?: boolean;
  anchorChoiceGroupKey?: string;
  mode: "interactive-slots" | "direct-pair";
  stage: CompareStage;
  slotA: BagProduct | null;
  slotB: BagProduct | null;
  confirmSelectedOptions: CompareConfirmOption[];
  followUpSelectedOptions: CompareFollowUpOption[];
  feedback: "up" | "down" | null;
}

export interface CompareTurnItemProps {
  turn: CompareThreadTurn;
  sheetOpenStagger?: boolean;
  registerChoiceGroupRef: (key: string, node: HTMLDivElement | null) => void;
  onRevealConfirmChoices: (turnId: string) => void;
  onOpenPicker: (turnId: string, slot: "A" | "B") => void;
  onEditChoices: (turnId: string) => void;
  onConfirmCompare: (turnId: string) => void;
  onConfirmSomethingElse: (turnId: string) => void;
  onCompareFeatures: (turnId: string) => void;
  onFollowUpSomethingElse: (turnId: string) => void;
  onFeedback: (turnId: string, vote: "up" | "down") => void;
}

export const seenCompareBubbleTurnIds = new Set<string>();
export const seenCompareSelectingTurnIds = new Set<string>();
export const seenCompareResultsTurnIds = new Set<string>();

export function resetSeenCompareTurnIds() {
  seenCompareBubbleTurnIds.clear();
  seenCompareSelectingTurnIds.clear();
  seenCompareResultsTurnIds.clear();
}

export function CompareTurnItem({
  turn,
  sheetOpenStagger = false,
  registerChoiceGroupRef,
  onRevealConfirmChoices,
  onOpenPicker,
  onEditChoices,
  onConfirmCompare,
  onConfirmSomethingElse,
  onCompareFeatures,
  onFollowUpSomethingElse,
  onFeedback,
}: CompareTurnItemProps) {
  const { slotA, slotB, stage, mode } = turn;
  const initialPrefilledKeyRef = useRef<string | null>(
    turn.prefilledFromRecent && slotA && slotB
      ? `${slotA.id}:${slotB.id}`
      : null,
  );
  const isComparedReady =
    stage === "compared" && slotA !== null && slotB !== null;

  const bubbleAlreadySeen = seenCompareBubbleTurnIds.has(turn.id);
  const selectingAlreadySeen = seenCompareSelectingTurnIds.has(turn.id);
  const resultsAlreadySeen = seenCompareResultsTurnIds.has(turn.id);

  const isConfirmCompareActive =
    turn.confirmSelectedOptions.includes("compare-choices");
  const isConfirmSomethingElseActive =
    turn.confirmSelectedOptions.includes("something-else");
  const isCompareFeaturesActive =
    turn.followUpSelectedOptions.includes("compare-features");
  const isFollowUpSomethingElseActive =
    turn.followUpSelectedOptions.includes("something-else");

  useEffect(() => {
    if (
      mode === "interactive-slots" &&
      stage === "selecting" &&
      slotA &&
      slotB &&
      turn.confirmSelectedOptions.length === 0
    ) {
      const currentPairKey = `${slotA.id}:${slotB.id}`;
      if (initialPrefilledKeyRef.current === currentPairKey) {
        return;
      }
      initialPrefilledKeyRef.current = null;
      onRevealConfirmChoices(turn.id);
    }
  }, [
    mode,
    stage,
    slotA,
    slotB,
    turn.confirmSelectedOptions.length,
    turn.id,
    onRevealConfirmChoices,
  ]);

  const renderSlot = (slot: "A" | "B", bag: BagProduct | null) => (
    <motion.div
      key={slot}
      variants={compareSlotItemVariants}
      className="w-151 h-270 shrink-0 stack-grid"
    >
      <AnimatePresence initial={false}>
        {bag ? (
          <motion.button
            key={bag.id}
            type="button"
            variants={compareSlotSwapVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => onOpenPicker(turn.id, slot)}
            className="stack-cell w-151 h-270 bg-surface rounded-slot overflow-hidden flex flex-col text-left press-scale motion-reduce:transition-none shadow-bubble"
          >
            <LayerGrid className="w-151 h-207 bg-surface-muted overflow-hidden shrink-0">
              <img
                src={bag.image}
                alt={bag.name}
                className="stack-cell w-151 h-207 object-cover"
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
              className="w-full h-2 object-cover shrink-0"
            />
            <Stack className="p-10 gap-4 bg-surface h-61 w-full">
              <p className="text-caption text-ink truncate m-0">{bag.name}</p>
              <p className="text-caption text-ink tabular-nums m-0">
                {bag.priceFormatted}
              </p>
            </Stack>
          </motion.button>
        ) : (
          <motion.button
            key={`empty-${slot}`}
            type="button"
            variants={compareSlotSwapVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => onOpenPicker(turn.id, slot)}
            className="stack-cell w-151 h-270 rounded-slot border border-dashed border-border-glass bg-surface-tile/40 hover:bg-surface-tile-hover flex flex-col items-center justify-center gap-18 press-scale motion-reduce:transition-none"
          >
            <span className="w-32 h-32 rounded-pill bg-surface flex items-center justify-center shadow-bubble">
              <img
                src="/assets/figma/icon-add-slot.svg"
                alt=""
                width={20}
                height={20}
                className="w-20 h-20"
              />
            </span>
            <span className="text-body text-ink-inverse tracking-xs text-center leading-tight">
              Tap to pick
              <br />
              {slot === "A" ? "product n.1" : slotA ? "a product" : "product n.2"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const specRows: Array<{ label: string; valueA: string; valueB: string }> =
    isComparedReady
      ? [
          {
            label: "Price",
            valueA: slotA.priceFormatted,
            valueB: slotB.priceFormatted,
          },
          {
            label: "Style",
            valueA: slotA.specs.style,
            valueB: slotB.specs.style,
          },
          {
            label: "Size",
            valueA: slotA.specs.size,
            valueB: slotB.specs.size,
          },
          {
            label: "Carry",
            valueA: slotA.specs.carry,
            valueB: slotB.specs.carry,
          },
          {
            label: "Best for",
            valueA: slotA.specs.bestFor,
            valueB: slotB.specs.bestFor,
          },
          {
            label: "Color",
            valueA: slotA.specs.color,
            valueB: slotB.specs.color,
          },
        ]
      : [];

  return (
    <div className="flex flex-col gap-16 w-full overflow-visible">
      {/* Optional User Bubble (shown on Cold Start starter selection, Compare Prompted Ad, or dock-typed compare prompt) */}
      {turn.showUserBubble && (
        <motion.div
          ref={(node) => {
            if (node) {
              seenCompareBubbleTurnIds.add(turn.id);
            }
          }}
          initial={
            bubbleAlreadySeen
              ? false
              : {
                  opacity: 0,
                  scale: 0.92,
                  filter: "blur(4px)",
                  y: 28,
                }
          }
          animate={{
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            y: 0,
            transition: {
              duration: DURATION_ENTER,
              delay: sheetOpenStagger ? 0.22 : 0,
              ease: EASE_PREMIUM,
            },
          }}
          exit={upwardCraftedBubbleVariants.exit as TargetAndTransition}
          className="self-end bg-surface text-ink px-10 py-8 rounded-tl-bubble rounded-bl-bubble rounded-br-bubble rounded-tr-sharp max-w-210 shadow-bubble flex flex-row items-center gap-6"
        >
          {(turn.showCompareIcon ||
            turn.userPrompt === "Help me compare bags") && (
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

      {/* Non-overlapping Loading -> Persistent Selecting + Appended Comparison Body */}
      <AnimatePresence
        mode="wait"
        initial={
          stage === "loading" ? !bubbleAlreadySeen : !selectingAlreadySeen
        }
      >
        {stage === "exiting-loading" ? null : stage === "loading" ? (
          <motion.div
            key="compare-stage-loading"
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
                delay: turn.showUserBubble
                  ? sheetOpenStagger
                    ? 0.34
                    : 0.12
                  : 0,
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
              aria-label="Loading comparison tools"
              className="h-22 px-10 rounded-pill bg-surface shadow-bubble flex flex-row items-center gap-4"
            >
              <span className="size-4 rounded-pill bg-ink animate-dot-1" />
              <span className="size-4 rounded-pill bg-ink animate-dot-2" />
              <span className="size-4 rounded-pill bg-ink animate-dot-3" />
            </Box>
          </motion.div>
        ) : (
          <div
            key="compare-stage-ready"
            className="flex flex-col gap-20 w-full overflow-visible"
          >
            {/* Interactive Slot Selection stays mounted when "Compare my choices" is clicked */}
            {mode === "interactive-slots" && (
              <motion.div
                ref={(node) => {
                  if (node) {
                    seenCompareSelectingTurnIds.add(turn.id);
                  }
                }}
                variants={staggerAnswerSequenceVariants}
                initial={selectingAlreadySeen ? false : "hidden"}
                animate="visible"
                className="flex flex-col gap-16 w-full overflow-visible"
              >
                <motion.div
                  variants={blurScaleVariants}
                  className="self-start flex flex-col gap-5 items-start"
                >
                  <span className="text-micro text-ink-inverse">Coach AI</span>
                  <Box className="w-296 max-w-full bg-surface p-10 rounded-bubble shadow-bubble text-caption text-ink tracking-xs text-pretty">
                    {turn.prefilledFromRecent && slotA && slotB
                      ? "I pulled in the last two styles you viewed — compare their silhouette, size, carry options, and best occasions side by side, or edit your choices below."
                      : "Select two bags below and I’ll compare their silhouette, size, carry options, and best occasions side by side."}
                  </Box>
                </motion.div>

                <motion.div
                  variants={compareSlotRowVariants}
                  className="flex flex-row gap-20 justify-center w-full pt-4"
                >
                  {renderSlot("A", slotA)}
                  {renderSlot("B", slotB)}
                </motion.div>

                <AnimatePresence initial={!selectingAlreadySeen}>
                  {(slotA || slotB) && (
                    <motion.button
                      key="edit-choices"
                      type="button"
                      variants={announceAfterModalVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      onClick={() => onEditChoices(turn.id)}
                      className="text-caption text-ink-inverse underline press-scale motion-reduce:transition-none self-center min-h-36 px-12 flex items-center justify-center"
                    >
                      Edit choices
                    </motion.button>
                  )}
                </AnimatePresence>

                <AnimatePresence initial={!selectingAlreadySeen}>
                  {slotA && slotB && (
                    <div
                      ref={(node) =>
                        registerChoiceGroupRef(`${turn.id}:confirm`, node)
                      }
                      className="w-full"
                    >
                      <motion.div
                        key="confirm-compare-actions"
                        variants={announceAfterModalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="flex flex-col gap-8 w-full items-center pt-4"
                      >
                        <Box className="flex flex-row gap-10 w-full">
                          <button
                            type="button"
                            aria-pressed={isConfirmCompareActive}
                            onClick={() => onConfirmCompare(turn.id)}
                            className={clsx(
                              "flex-1 min-w-0 p-13 rounded-tile border border-border-glass flex flex-col justify-between gap-24 text-left press-scale motion-reduce:transition-none",
                              isConfirmCompareActive
                                ? "bg-surface text-ink"
                                : "bg-surface-tile hover:bg-surface-tile-hover text-ink-inverse",
                            )}
                          >
                            <img
                              src="/assets/figma/icon-check-white.svg"
                              alt=""
                              width={20}
                              height={20}
                              className={clsx(
                                "w-20 h-20 shrink-0 transition-icon-invert motion-reduce:transition-none",
                                isConfirmCompareActive && "invert scale-105",
                              )}
                            />
                            <span className="text-body tracking-xs leading-snug">
                              Compare
                              <br />
                              my choices
                            </span>
                          </button>
                          <button
                            type="button"
                            aria-pressed={isConfirmSomethingElseActive}
                            onClick={() => onConfirmSomethingElse(turn.id)}
                            className={clsx(
                              "flex-1 min-w-0 p-13 rounded-tile border border-border-glass flex flex-col justify-between gap-24 text-left press-scale motion-reduce:transition-none",
                              isConfirmSomethingElseActive
                                ? "bg-surface text-ink"
                                : "bg-surface-tile hover:bg-surface-tile-hover text-ink-inverse",
                            )}
                          >
                            <img
                              src="/assets/figma/icon-ai-white.svg"
                              alt=""
                              width={20}
                              height={20}
                              className={clsx(
                                "w-20 h-20 shrink-0 transition-icon-invert motion-reduce:transition-none",
                                isConfirmSomethingElseActive &&
                                  "invert scale-105",
                              )}
                            />
                            <span className="text-body tracking-xs leading-snug">
                              Help me with something else
                            </span>
                          </button>
                        </Box>
                        <span className="text-micro text-ink-inverse">
                          Pick an option to continue
                        </span>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Side-by-side Comparison Results continue directly below */}
            <AnimatePresence initial={!resultsAlreadySeen}>
              {isComparedReady && (
                <motion.div
                  key="compare-results"
                  ref={(node) => {
                    if (node) {
                      seenCompareSelectingTurnIds.add(turn.id);
                      seenCompareResultsTurnIds.add(turn.id);
                    }
                  }}
                  variants={staggerAnswerSequenceVariants}
                  initial={resultsAlreadySeen ? false : "hidden"}
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-20 w-full overflow-visible"
                >
                  {/* 1. Coach AI Comparison Lead */}
                  <motion.div
                    variants={blurScaleVariants}
                    className="flex flex-col gap-5 items-start"
                  >
                    <span className="text-micro text-ink-inverse">Coach AI</span>
                    <Box className="w-296 max-w-full bg-surface p-10 rounded-bubble shadow-bubble text-caption text-ink tracking-xs text-pretty">
                      Here’s a quick comparison between {slotA.shortName} and{" "}
                      {slotB.shortName}.
                    </Box>
                  </motion.div>

                  {/* 2. Side-by-Side Product Cards */}
                  <motion.div
                    variants={staggerCardsVariants}
                    className="flex flex-row gap-10 w-full"
                  >
                    {(
                      [
                        { slot: "A" as const, bag: slotA },
                        { slot: "B" as const, bag: slotB },
                      ]
                    ).map(({ slot, bag }) => (
                      <motion.div
                        key={slot}
                        variants={blurScaleVariants}
                        className="flex-1 min-w-0 stack-grid"
                      >
                        <AnimatePresence initial={false}>
                          <motion.button
                            key={bag.id}
                            type="button"
                            variants={compareSlotSwapVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={() => onOpenPicker(turn.id, slot)}
                            className="stack-cell w-full bg-surface rounded-slot overflow-hidden flex flex-col text-left press-scale motion-reduce:transition-none shadow-bubble"
                          >
                            <LayerGrid className="w-full h-207 bg-surface-muted overflow-hidden">
                              <img
                                src={bag.image}
                                alt={bag.name}
                                className="stack-cell w-full h-207 object-cover"
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
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* 3. Cascading 6 Spec Rows */}
                  <motion.div
                    variants={staggerCardsVariants}
                    className="flex flex-col w-full text-ink-inverse"
                  >
                    {specRows.map((row, idx) => (
                      <motion.div
                        key={row.label}
                        variants={blurScaleVariants}
                        className={clsx(
                          "py-10 flex flex-row gap-15 w-full",
                          idx < 5 && "border-b border-border-divider",
                        )}
                      >
                        <Stack className="flex-1 min-w-0 gap-2">
                          <span className="text-body text-ink-inverse">
                            {row.label}
                          </span>
                          <span className="text-subhead text-ink-inverse-muted tabular-nums">
                            {row.valueA}
                          </span>
                        </Stack>
                        <Stack className="flex-1 min-w-0 gap-2">
                          <span className="text-body text-ink-inverse">
                            {row.label}
                          </span>
                          <span className="text-subhead text-ink-inverse-muted tabular-nums">
                            {row.valueB}
                          </span>
                        </Stack>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* 4. Recommendation Card */}
                  <motion.div
                    variants={blurScaleVariants}
                    className="bg-surface-recommend rounded-bubble p-15 flex flex-col gap-10 text-ink-inverse"
                  >
                    <p className="text-subhead font-medium m-0">
                      Our recommendation
                    </p>
                    <p className="text-body text-ink-inverse-soft m-0 text-pretty">
                      {slotA.specs.summaryNote} {slotB.specs.summaryNote}
                    </p>
                    <Cluster className="self-start bg-surface text-ink rounded-slot px-8 py-5 gap-4 text-caption">
                      <img
                        src="/assets/figma/sparkle-black.svg"
                        alt=""
                        width={14}
                        height={14}
                        className="w-14 h-14 shrink-0"
                      />
                      <span>AI-powered comparison</span>
                    </Cluster>
                  </motion.div>

                  {/* 5. Follow-up Coach AI Question + Feedback + Option Tiles */}
                  <motion.div
                    variants={blurScaleVariants}
                    className="flex flex-col gap-20 w-full"
                  >
                    <Stack className="gap-5 items-start">
                      <span className="text-micro text-ink-inverse">
                        Coach AI
                      </span>
                      <Box className="w-296 max-w-full bg-surface p-10 rounded-bubble shadow-bubble text-caption text-ink tracking-xs text-pretty">
                        Would you like to know about something specific or
                        compare something else?
                      </Box>
                    </Stack>

                    <Cluster className="gap-10">
                      <span className="text-micro text-ink-inverse">
                        How was my answer?
                      </span>
                      <Cluster className="gap-4">
                        <button
                          type="button"
                          aria-label="Helpful comparison"
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
                          aria-label="Unhelpful comparison"
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

                    <div
                      ref={(node) =>
                        registerChoiceGroupRef(`${turn.id}:followup`, node)
                      }
                      className="w-full"
                    >
                      <Stack className="w-full gap-8 items-center">
                        <Box className="flex flex-row gap-10 w-full">
                          <button
                            type="button"
                            aria-pressed={isCompareFeaturesActive}
                            onClick={() => onCompareFeatures(turn.id)}
                            className={clsx(
                              "flex-1 min-w-0 p-13 rounded-tile border border-border-glass flex flex-col justify-between gap-24 text-left press-scale motion-reduce:transition-none",
                              isCompareFeaturesActive
                                ? "bg-surface text-ink"
                                : "bg-surface-tile hover:bg-surface-tile-hover text-ink-inverse",
                            )}
                          >
                            <img
                              src="/assets/figma/icon-split-compare.svg"
                              alt=""
                              width={20}
                              height={20}
                              className={clsx(
                                "w-20 h-20 shrink-0 transition-icon-invert motion-reduce:transition-none",
                                isCompareFeaturesActive && "invert scale-105",
                              )}
                            />
                            <span className="text-body tracking-xs leading-snug">
                              Compare features
                            </span>
                          </button>
                          <button
                            type="button"
                            aria-pressed={isFollowUpSomethingElseActive}
                            onClick={() => onFollowUpSomethingElse(turn.id)}
                            className={clsx(
                              "flex-1 min-w-0 p-13 rounded-tile border border-border-glass flex flex-col justify-between gap-24 text-left press-scale motion-reduce:transition-none",
                              isFollowUpSomethingElseActive
                                ? "bg-surface text-ink"
                                : "bg-surface-tile hover:bg-surface-tile-hover text-ink-inverse",
                            )}
                          >
                            <img
                              src="/assets/figma/icon-ai-white.svg"
                              alt=""
                              width={20}
                              height={20}
                              className={clsx(
                                "w-20 h-20 shrink-0 transition-icon-invert motion-reduce:transition-none",
                                isFollowUpSomethingElseActive &&
                                  "invert scale-105",
                              )}
                            />
                            <span className="text-body tracking-xs leading-snug">
                              Help me with something else
                            </span>
                          </button>
                        </Box>
                        <span className="text-micro text-ink-inverse">
                          Pick an option to continue
                        </span>
                      </Stack>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
