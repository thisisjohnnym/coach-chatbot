import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
} from "motion/react";
import type { BagProduct, CannedReply } from "../data/catalog";
import {
  DURATION_ENTER,
  EASE_PREMIUM,
  blurScaleVariants,
  contextualIconVariants,
  scrollCueAnnounceVariants,
  staggerAnswerSequenceVariants,
  staggerCardsVariants,
} from "../motion/presets";
import { Box, Cluster, Layer, LayerGrid, Stack } from "../primitives/Layout";
import {
  CompareTurnItem,
  resetSeenCompareTurnIds,
  seenCompareBubbleTurnIds,
  seenCompareResultsTurnIds,
  seenCompareSelectingTurnIds,
  type CompareStage,
  type CompareThreadTurn,
} from "./CompareFlowView";
import {
  OutfitTurnItem,
  resetSeenOutfitTurnIds,
  seenOutfitAwaitingTurnIds,
  seenOutfitBubbleTurnIds,
  seenOutfitMatchedTurnIds,
  type OutfitStage,
  type OutfitThreadTurn,
} from "./OutfitFlowView";

export type ChatTurnStatus =
  | "thinking"
  | "exiting-thinking"
  | "answered";

export interface ChatMessageTurn {
  kind: "chat";
  id: string;
  userPrompt: string;
  showUserBubble: boolean;
  status: ChatTurnStatus;
  reply?: CannedReply;
  selectedOptions: string[];
  feedback?: "up" | "down" | null;
  anchorChoiceGroupKey?: string;
}

export type ThreadTurn =
  | ChatMessageTurn
  | CompareThreadTurn
  | OutfitThreadTurn;

export interface ChatThreadViewProps {
  turns: ThreadTurn[];
  steadyStage?: boolean;
  sheetOpenStagger?: boolean;
  bagIdsInCart?: string[];
  onSelectOption: (turnId: string, option: string) => void;
  onSelectUgcClip?: (turnId: string, clipId: string) => void;
  onFeedback: (turnId: string, vote: "up" | "down") => void;
  onInspectBag?: (bag: BagProduct) => void;
  onToggleBagItem?: (bag: BagProduct) => void;
  onViewBagDetails?: (bag: BagProduct) => void;
  onPickSelfie: (turnId: string) => void;
  onOpenComparePicker: (turnId: string, slot: "A" | "B") => void;
  onEditCompareChoices: (turnId: string) => void;
  onConfirmCompare: (turnId: string) => void;
  onConfirmCompareSomethingElse: (turnId: string) => void;
  onCompareFeatures: (turnId: string) => void;
  onFollowUpCompareSomethingElse: (turnId: string) => void;
}

export const seenPromptTurnIds = new Set<string>();
export const seenAnsweredTurnIds = new Set<string>();
let savedThreadScrollTop = 0;

export function resetSeenChatTurnIds() {
  seenPromptTurnIds.clear();
  seenAnsweredTurnIds.clear();
  resetSeenCompareTurnIds();
  resetSeenOutfitTurnIds();
  savedThreadScrollTop = 0;
}

function TypingIndicatorPill() {
  return (
    <Stack className="gap-5 items-start">
      <span className="text-micro text-ink-inverse">Coach AI</span>
      <Box
        role="status"
        aria-label="Coach AI is typing"
        className="bg-surface rounded-pill h-22 px-10 flex flex-row items-center gap-4 shadow-bubble"
      >
        <span className="size-4 rounded-pill bg-ink animate-dot-1" />
        <span className="size-4 rounded-pill bg-ink animate-dot-2" />
        <span className="size-4 rounded-pill bg-ink animate-dot-3" />
      </Box>
    </Stack>
  );
}

export function ChatThreadView({
  turns,
  sheetOpenStagger = false,
  bagIdsInCart = [],
  onSelectOption,
  onSelectUgcClip,
  onFeedback,
  onInspectBag,
  onToggleBagItem,
  onViewBagDetails,
  onPickSelfie,
  onOpenComparePicker,
  onEditCompareChoices,
  onConfirmCompare,
  onConfirmCompareSomethingElse,
  onCompareFeatures,
  onFollowUpCompareSomethingElse,
}: ChatThreadViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const turnElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const choiceGroupRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevTurnSignatureRef = useRef<string>("");
  const prevCompareStagesRef = useRef<Map<string, CompareStage>>(new Map());
  const prevOutfitStagesRef = useRef<Map<string, OutfitStage>>(new Map());
  const scrollRafRef = useRef<number | null>(null);

  const [scrolledTop, setScrolledTop] = useState(0);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const firstTurn = turns[0];
  const isCompactPreAnswer =
    turns.length === 1 &&
    Boolean(firstTurn) &&
    ((firstTurn.kind === "chat" && firstTurn.status !== "answered") ||
      (firstTurn.kind === "compare" &&
        (firstTurn.stage === "loading" ||
          firstTurn.stage === "exiting-loading")) ||
      (firstTurn.kind === "outfit" &&
        (firstTurn.stage === "loading" ||
          firstTurn.stage === "exiting-loading")));

  const hasTopEdge = !isCompactPreAnswer && scrolledTop > 8;
  const hasBottomEdge = !isCompactPreAnswer && canScrollDown;
  const scrollMaskClass =
    hasTopEdge && hasBottomEdge
      ? "scroll-mask-both"
      : hasTopEdge
        ? "scroll-mask-top"
        : hasBottomEdge
          ? "scroll-mask-bottom"
          : "";

  const registerChoiceGroupRef = useCallback(
    (key: string, node: HTMLDivElement | null) => {
      if (node) {
        choiceGroupRefs.current.set(key, node);
      } else {
        choiceGroupRefs.current.delete(key);
      }
    },
    [],
  );

  const syncScrollMetrics = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nextTop = el.scrollTop;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    savedThreadScrollTop = nextTop;
    setScrolledTop(nextTop);
    setCanScrollDown(remaining > 16);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || isCompactPreAnswer) return;
    if (savedThreadScrollTop > 0) {
      el.scrollTop = savedThreadScrollTop;
    }
  }, [isCompactPreAnswer]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (turns.length === 0) {
      resetSeenChatTurnIds();
      return;
    }

    const activeIds = new Set(turns.map((turn) => turn.id));
    for (const setRef of [
      seenPromptTurnIds,
      seenAnsweredTurnIds,
      seenCompareBubbleTurnIds,
      seenCompareSelectingTurnIds,
      seenCompareResultsTurnIds,
      seenOutfitBubbleTurnIds,
      seenOutfitAwaitingTurnIds,
      seenOutfitMatchedTurnIds,
    ]) {
      for (const id of setRef) {
        if (!activeIds.has(id)) {
          setRef.delete(id);
        }
      }
    }

    for (const turn of turns) {
      if (turn.kind === "chat" && turn.showUserBubble) {
        seenPromptTurnIds.add(turn.id);
      } else if (turn.kind === "compare" && turn.showUserBubble) {
        seenCompareBubbleTurnIds.add(turn.id);
      } else if (turn.kind === "outfit" && turn.showUserBubble) {
        seenOutfitBubbleTurnIds.add(turn.id);
      }
    }
  }, [turns]);

  useEffect(() => {
    if (isCompactPreAnswer) {
      setScrolledTop(0);
      setCanScrollDown(false);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
      return;
    }

    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl) return;

    syncScrollMetrics();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      syncScrollMetrics();
    });
    observer.observe(scrollEl);
    if (contentEl) {
      observer.observe(contentEl);
    }
    return () => {
      observer.disconnect();
    };
  }, [isCompactPreAnswer, syncScrollMetrics, turns]);

  const handleRevealConfirmChoices = useCallback((turnId: string) => {
    const scrollEl = scrollRef.current;
    const turnEl = turnElementsRef.current.get(turnId);
    if (!scrollEl || !turnEl) return;

    if (scrollRafRef.current !== null) {
      window.cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const turnBottomInScroll =
        scrollEl.scrollTop +
        (turnEl.getBoundingClientRect().bottom -
          scrollEl.getBoundingClientRect().top) +
        24;
      const neededTop = turnBottomInScroll - scrollEl.clientHeight;
      if (neededTop > scrollEl.scrollTop) {
        scrollEl.scrollTo({ top: neededTop, behavior: "smooth" });
      }
    });
  }, []);

  // Scroll smoothly when an interactive Compare turn expands its side-by-side comparison below "Compare my choices"
  useEffect(() => {
    const scrollEl = scrollRef.current;
    let newlyComparedTurnId: string | null = null;

    for (const turn of turns) {
      if (turn.kind !== "compare") continue;
      const prevStage = prevCompareStagesRef.current.get(turn.id);
      if (
        prevStage === "selecting" &&
        turn.stage === "compared" &&
        turn.mode === "interactive-slots"
      ) {
        newlyComparedTurnId = turn.id;
      }
      prevCompareStagesRef.current.set(turn.id, turn.stage);
    }

    if (!newlyComparedTurnId || !scrollEl) return;

    const confirmGroupEl = choiceGroupRefs.current.get(
      `${newlyComparedTurnId}:confirm`,
    );
    if (!confirmGroupEl) return;

    const rafId = window.requestAnimationFrame(() => {
      const targetTop =
        scrollEl.scrollTop +
        (confirmGroupEl.getBoundingClientRect().top -
          scrollEl.getBoundingClientRect().top) -
        8;
      scrollEl.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [turns]);

  // Scroll smoothly when an Outfit turn simulates picking a selfie and reveals matched bags below
  useEffect(() => {
    const scrollEl = scrollRef.current;
    let newlyMatchedTurnId: string | null = null;

    for (const turn of turns) {
      if (turn.kind !== "outfit") continue;
      const prevStage = prevOutfitStagesRef.current.get(turn.id);
      if (prevStage === "awaiting-selfie" && turn.stage === "matched") {
        newlyMatchedTurnId = turn.id;
      }
      prevOutfitStagesRef.current.set(turn.id, turn.stage);
    }

    if (!newlyMatchedTurnId || !scrollEl) return;

    const rafId = window.requestAnimationFrame(() => {
      const resultsEl = choiceGroupRefs.current.get(
        `${newlyMatchedTurnId}:results`,
      );
      if (!resultsEl) return;

      const targetTop =
        scrollEl.scrollTop +
        (resultsEl.getBoundingClientRect().top -
          scrollEl.getBoundingClientRect().top) -
        124;
      scrollEl.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [turns]);

  const scrollTurnIntoView = useCallback((turn: ThreadTurn) => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const anchorEl =
      !turn.showUserBubble && turn.anchorChoiceGroupKey
        ? (choiceGroupRefs.current.get(turn.anchorChoiceGroupKey) ??
          turnElementsRef.current.get(turn.id))
        : turnElementsRef.current.get(turn.id);

    if (!anchorEl) return;

    window.requestAnimationFrame(() => {
      const rawTop =
        scrollEl.scrollTop +
        (anchorEl.getBoundingClientRect().top -
          scrollEl.getBoundingClientRect().top);
      const topInset = rawTop > 16 ? 24 : 8;
      scrollEl.scrollTo({
        top: Math.max(0, rawTop - topInset),
        behavior: "smooth",
      });
    });
  }, []);

  // Scroll smoothly when a new continuation turn mounts or advances below the active choice / user prompt
  useEffect(() => {
    const latest = turns[turns.length - 1];
    if (!latest) return;

    const latestPhase =
      latest.kind === "chat" ? latest.status : latest.stage;
    const nextSignature = `${turns.length}:${latest.id}:${latestPhase}`;
    const prevSignature = prevTurnSignatureRef.current;
    prevTurnSignatureRef.current = nextSignature;

    if (
      isCompactPreAnswer ||
      turns.length <= 1 ||
      !prevSignature ||
      nextSignature === prevSignature ||
      latestPhase === "exiting-thinking" ||
      latestPhase === "exiting-loading"
    ) {
      return;
    }

    scrollTurnIntoView(latest);
  }, [isCompactPreAnswer, scrollTurnIntoView, turns]);

  const handleScrollDownCue = () => {
    scrollRef.current?.scrollBy({ top: 320, behavior: "smooth" });
  };

  return (
    <LayerGrid
      className={clsx(
        "w-full min-w-0",
        isCompactPreAnswer
          ? "pb-8 overflow-visible"
          : "h-full min-h-0 grid-rows-1 overflow-hidden",
      )}
    >
      <div
        ref={scrollRef}
        onScroll={syncScrollMetrics}
        className={clsx(
          "stack-cell w-full min-w-0 px-12 pt-6",
          isCompactPreAnswer
            ? "pb-14 overflow-visible"
            : clsx(
                "h-full min-h-0 pb-52 overflow-y-auto sheet-scrollbar",
                scrollMaskClass,
              ),
        )}
      >
        <div ref={contentRef} className="flex flex-col gap-20 w-full min-w-0">
          {turns.map((turn, turnIdx) => {
            if (turn.kind === "compare") {
              return (
                <div
                  key={turn.id}
                  ref={(node) => {
                    if (node) {
                      turnElementsRef.current.set(turn.id, node);
                    } else {
                      turnElementsRef.current.delete(turn.id);
                    }
                  }}
                  className="w-full min-w-0"
                >
                  <CompareTurnItem
                    turn={turn}
                    sheetOpenStagger={sheetOpenStagger && turnIdx === 0}
                    bagIdsInCart={bagIdsInCart}
                    registerChoiceGroupRef={registerChoiceGroupRef}
                    onRevealConfirmChoices={handleRevealConfirmChoices}
                    onOpenPicker={onOpenComparePicker}
                    onEditChoices={onEditCompareChoices}
                    onConfirmCompare={onConfirmCompare}
                    onConfirmSomethingElse={onConfirmCompareSomethingElse}
                    onCompareFeatures={onCompareFeatures}
                    onFollowUpSomethingElse={onFollowUpCompareSomethingElse}
                    onToggleBagItem={onToggleBagItem}
                    onViewBagDetails={onViewBagDetails}
                    onFeedback={onFeedback}
                  />
                </div>
              );
            }

            if (turn.kind === "outfit") {
              return (
                <div
                  key={turn.id}
                  ref={(node) => {
                    if (node) {
                      turnElementsRef.current.set(turn.id, node);
                    } else {
                      turnElementsRef.current.delete(turn.id);
                    }
                  }}
                  className="w-full min-w-0"
                >
                  <OutfitTurnItem
                    turn={turn}
                    sheetOpenStagger={sheetOpenStagger && turnIdx === 0}
                    registerChoiceGroupRef={registerChoiceGroupRef}
                    onPickSelfie={onPickSelfie}
                    onInspectBag={onInspectBag}
                    onSelectOption={onSelectOption}
                    onFeedback={onFeedback}
                  />
                </div>
              );
            }

            const promptAlreadySeen = seenPromptTurnIds.has(turn.id);
            const answerAlreadySeen = seenAnsweredTurnIds.has(turn.id);

            return (
              <div
                key={turn.id}
                ref={(node) => {
                  if (node) {
                    turnElementsRef.current.set(turn.id, node);
                  } else {
                    turnElementsRef.current.delete(turn.id);
                  }
                }}
                className="flex flex-col gap-16 w-full min-w-0"
              >
                {turn.showUserBubble && (
                  <motion.div
                    ref={(node) => {
                      if (node) {
                        seenPromptTurnIds.add(turn.id);
                      }
                    }}
                    initial={
                      promptAlreadySeen
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
                        delay: sheetOpenStagger && turnIdx === 0 ? 0.22 : 0,
                        ease: EASE_PREMIUM,
                      },
                    }}
                    exit={blurScaleVariants.exit as TargetAndTransition}
                    className="self-end bg-surface text-ink px-10 py-8 rounded-tl-bubble rounded-bl-bubble rounded-br-bubble rounded-tr-sharp max-w-210 shadow-bubble"
                  >
                    <p className="text-caption tracking-xs text-balance m-0">
                      {turn.userPrompt}
                    </p>
                  </motion.div>
                )}

                <AnimatePresence
                  mode="wait"
                  initial={
                    turn.status === "thinking"
                      ? !promptAlreadySeen
                      : !answerAlreadySeen
                  }
                >
                  {turn.status === "exiting-thinking" ? null : turn.status ===
                    "thinking" ? (
                    <motion.div
                      key="thinking"
                      initial={
                        promptAlreadySeen
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
                            ? sheetOpenStagger && turnIdx === 0
                              ? 0.34
                              : 0.12
                            : 0,
                          ease: EASE_PREMIUM,
                        },
                      }}
                      exit={blurScaleVariants.exit as TargetAndTransition}
                      className="self-start"
                    >
                      <TypingIndicatorPill />
                    </motion.div>
                  ) : turn.status === "answered" && turn.reply ? (
                    <motion.div
                      key="answered"
                      ref={(node) => {
                        if (node && !seenAnsweredTurnIds.has(turn.id)) {
                          seenAnsweredTurnIds.add(turn.id);
                          if (turnIdx > 0 && turnIdx === turns.length - 1) {
                            scrollTurnIntoView(turn);
                          }
                        }
                      }}
                      variants={staggerAnswerSequenceVariants}
                      initial={answerAlreadySeen ? false : "hidden"}
                      animate="visible"
                      exit="exit"
                      className="flex flex-col gap-14 w-full min-w-0 items-start"
                    >
                      {/* Figma suggestion order (chat 22): Coach AI → product carousel → curation copy */}
                      <motion.div
                        variants={blurScaleVariants}
                        className="flex flex-col gap-5 items-start max-w-full min-w-0"
                      >
                        <span className="text-micro text-ink-inverse">
                          Coach AI
                        </span>
                      </motion.div>

                      {turn.reply.bags && turn.reply.bags.length > 0 && (
                        <motion.div
                          variants={staggerCardsVariants}
                          className="flex flex-row gap-8 w-full min-w-0 overflow-x-auto no-scrollbar py-2"
                        >
                          {turn.reply.bags.map((bag) => (
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

                      {turn.reply.leadParagraphs.length > 0 && (
                        <motion.div
                          variants={blurScaleVariants}
                          className="flex flex-col gap-5 items-start max-w-full min-w-0"
                        >
                          <Stack className="w-296 max-w-full bg-surface p-10 rounded-bubble shadow-bubble gap-10">
                            {turn.reply.leadParagraphs.map((paragraph, idx) => (
                              <p
                                key={idx}
                                className="text-caption text-ink tracking-xs text-pretty m-0"
                              >
                                {paragraph}
                              </p>
                            ))}
                          </Stack>
                        </motion.div>
                      )}

                      {turn.reply.ugcClips && turn.reply.ugcClips.length > 0 && (
                        <motion.div
                          variants={staggerCardsVariants}
                          className="flex flex-row gap-8 w-full min-w-0 overflow-x-auto no-scrollbar py-2"
                        >
                          {turn.reply.ugcClips.map((clip) => (
                            <motion.button
                              key={clip.id}
                              type="button"
                              variants={blurScaleVariants}
                              aria-label={`Play ${clip.alt}`}
                              onClick={() =>
                                onSelectUgcClip?.(turn.id, clip.id)
                              }
                              className="w-132 shrink-0 rounded-card overflow-hidden press-scale motion-reduce:transition-none shadow-bubble"
                            >
                              <LayerGrid className="w-full aspect-picker-card bg-surface-muted overflow-hidden">
                                <img
                                  src={clip.image}
                                  alt={clip.alt}
                                  className="stack-cell w-full h-full object-cover"
                                />
                                <img
                                  src="/assets/figma/icon-play-overlay.svg"
                                  alt=""
                                  width={36}
                                  height={36}
                                  className="stack-cell self-center justify-self-center w-36 h-36 pointer-events-none"
                                />
                                <img
                                  src="/assets/figma/icon-tiktok.svg"
                                  alt=""
                                  width={18}
                                  height={18}
                                  className="stack-cell self-start justify-self-end w-18 h-18 m-8 pointer-events-none"
                                />
                              </LayerGrid>
                            </motion.button>
                          ))}
                        </motion.div>
                      )}

                      <motion.div
                        variants={blurScaleVariants}
                        className="flex flex-col gap-12 items-start max-w-full min-w-0"
                      >
                        {turn.reply.followUpNote && (
                          <Box className="w-296 max-w-full bg-surface p-10 rounded-bubble shadow-bubble text-caption text-ink tracking-xs text-pretty">
                            <p className="m-0">{turn.reply.followUpNote}</p>
                          </Box>
                        )}

                        {turn.reply.featuredBag && (() => {
                          const featuredBag = turn.reply.featuredBag;
                          const isFeaturedInBag = bagIdsInCart.includes(
                            featuredBag.id,
                          );

                          return (
                            <Box className="w-296 max-w-full bg-surface p-10 rounded-bubble shadow-bubble flex flex-col gap-10">
                              <button
                                type="button"
                                onClick={() => onViewBagDetails?.(featuredBag)}
                                className="w-full flex flex-row items-center gap-10 text-left press-scale motion-reduce:transition-none"
                              >
                                <Box className="w-64 h-76 rounded-card bg-surface-muted overflow-hidden image-outline shrink-0">
                                  <img
                                    src={featuredBag.image}
                                    alt={featuredBag.name}
                                    className="w-64 h-76 object-cover"
                                  />
                                </Box>
                                <Stack className="min-w-0 flex-1 gap-4">
                                  <p className="text-caption font-medium text-ink line-clamp-2 text-pretty m-0">
                                    {featuredBag.name}
                                  </p>
                                  <p className="text-micro text-ink-muted truncate m-0">
                                    {featuredBag.specs.color} ·{" "}
                                    {featuredBag.specs.size}
                                  </p>
                                  <p className="text-caption font-medium text-ink tabular-nums m-0">
                                    {featuredBag.priceFormatted}
                                  </p>
                                </Stack>
                              </button>

                              <Box className="flex flex-row gap-8 w-full">
                                <button
                                  type="button"
                                  aria-pressed={isFeaturedInBag}
                                  aria-label={
                                    isFeaturedInBag
                                      ? `Remove ${featuredBag.shortName} from bag`
                                      : `Add ${featuredBag.shortName} to bag`
                                  }
                                  onClick={() => onToggleBagItem?.(featuredBag)}
                                  className={clsx(
                                    "flex-1 min-w-0 h-40 px-10 rounded-pill flex flex-row items-center justify-center gap-5 text-caption font-medium tracking-xs whitespace-nowrap press-scale motion-reduce:transition-none",
                                    isFeaturedInBag
                                      ? "bg-ink-charcoal text-ink-inverse"
                                      : "bg-ink text-ink-inverse",
                                  )}
                                >
                                  <LayerGrid className="w-15 h-15 place-items-center shrink-0">
                                    <AnimatePresence mode="wait" initial={false}>
                                      {isFeaturedInBag ? (
                                        <motion.img
                                          key="added-check"
                                          variants={contextualIconVariants}
                                          initial="hidden"
                                          animate="visible"
                                          exit="exit"
                                          src="/assets/figma/icon-check-white.svg"
                                          alt=""
                                          width={15}
                                          height={15}
                                          className="stack-cell w-15 h-15"
                                        />
                                      ) : (
                                        <motion.img
                                          key="bag-icon"
                                          variants={contextualIconVariants}
                                          initial="hidden"
                                          animate="visible"
                                          exit="exit"
                                          src="/assets/figma/icon-bag-white.svg"
                                          alt=""
                                          width={15}
                                          height={15}
                                          className="stack-cell w-15 h-15"
                                        />
                                      )}
                                    </AnimatePresence>
                                  </LayerGrid>
                                  <span>
                                    {isFeaturedInBag ? "Added" : "Add to bag"}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onViewBagDetails?.(featuredBag)}
                                  className="flex-1 min-w-0 h-40 px-10 rounded-pill bg-surface text-ink border border-border-chip hover:bg-surface-muted flex flex-row items-center justify-center text-caption font-medium tracking-xs whitespace-nowrap press-scale motion-reduce:transition-none"
                                >
                                  View details
                                </button>
                              </Box>
                            </Box>
                          );
                        })()}

                        <Cluster className="gap-10 pt-2">
                          <span className="text-micro text-ink-inverse">
                            How was my answer?
                          </span>
                          <Cluster className="gap-4">
                            <button
                              type="button"
                              aria-label="Helpful answer"
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
                              aria-label="Unhelpful answer"
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

                      {turn.reply.options && turn.reply.options.length > 0 && (
                        <div
                          ref={(node) =>
                            registerChoiceGroupRef(`${turn.id}:options`, node)
                          }
                          className="w-full"
                        >
                          <motion.div
                            key="pick-an-option"
                            variants={blurScaleVariants}
                            initial={answerAlreadySeen ? false : "hidden"}
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
                              {turn.reply.options.map((opt) => {
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
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <Layer className="z-20 self-end justify-self-center pb-10 pointer-events-none">
        <AnimatePresence>
          {hasBottomEdge && (
            <motion.button
              key="scroll-down-cue"
              type="button"
              variants={scrollCueAnnounceVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={handleScrollDownCue}
              className="pointer-events-auto w-40 h-40 rounded-pill bg-surface shadow-scroll-cue flex items-center justify-center press-scale motion-reduce:transition-none"
            >
              <img
                src="/assets/figma/icon-arrow-down.svg"
                alt="Scroll down"
                width={20}
                height={20}
                className="w-20 h-20"
              />
            </motion.button>
          )}
        </AnimatePresence>
      </Layer>
    </LayerGrid>
  );
}
