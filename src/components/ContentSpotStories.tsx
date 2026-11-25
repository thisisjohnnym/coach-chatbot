import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useReducedMotion,
} from "motion/react";
import {
  STATEMENT_PROMPT,
  STORIES_COMPARE_PAIR,
  STORIES_STARTER_CARDS,
  type BagProduct,
} from "../data/catalog";
import { DURATION_EXIT, EASE_PREMIUM, blurScaleVariants } from "../motion/presets";
import { Box, Cluster, Layer, LayerGrid, Stack } from "../primitives/Layout";

const STORY_COUNT = 4;
const STORY_DURATION_MS = 6000;

export type StoriesSpotAction =
  | { kind: "cold-start" }
  | { kind: "prompt"; prompt: string }
  | { kind: "outfit" }
  | { kind: "compare"; pair: [BagProduct, BagProduct] };

export interface ContentSpotStoriesProps {
  dismissed: boolean;
  paused?: boolean;
  onTriggerAction: (action: StoriesSpotAction) => void;
  onDismiss: () => void;
}

const slideContentVariants = {
  hidden: blurScaleVariants.hidden,
  visible: blurScaleVariants.visible,
  exit: {
    opacity: 0,
    scale: 0.97,
    filter: "blur(3px)",
    transition: { duration: DURATION_EXIT * 0.55, ease: EASE_PREMIUM },
  },
};

function SendArrowPill() {
  return (
    <LayerGrid className="w-46 h-40 place-items-center isolate shrink-0">
      <Layer
        as="span"
        className="z-0 w-44 h-36 mt-4 rounded-pill send-orb-halo opacity-90 pointer-events-none"
      />
      <Layer
        as="span"
        className="z-10 w-46 h-40 rounded-pill bg-surface flex items-center justify-center shadow-bubble"
      >
        <img
          src="/assets/figma/icon-chevron-send.svg"
          alt=""
          width={16}
          height={16}
          className="w-16 h-16 rotate-90 invert"
        />
      </Layer>
    </LayerGrid>
  );
}

function CoachAiMentionPill() {
  return (
    <Box
      as="span"
      className="bg-surface text-ink rounded-pill px-5 pt-3 pb-2 text-caption font-medium tracking-xs whitespace-nowrap"
    >
      @Coach Ai
    </Box>
  );
}

function StoryTypingDots() {
  return (
    <Cluster className="bg-surface rounded-pill h-22 px-8 gap-4 shadow-bubble">
      <span className="size-4 bg-ink rounded-pill animate-dot-1" />
      <span className="size-4 bg-ink rounded-pill animate-dot-2" />
      <span className="size-4 bg-ink rounded-pill animate-dot-3" />
    </Cluster>
  );
}

export function ContentSpotStories({
  dismissed,
  paused = false,
  onTriggerAction,
  onDismiss,
}: ContentSpotStoriesProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeBarRef = useRef<HTMLDivElement | null>(null);
  const elapsedMsRef = useRef(0);
  const pointerDownRef = useRef<{
    x: number;
    y: number;
    time: number;
    interactive: boolean;
  } | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const setBarScale = useCallback((ratio: number) => {
    if (activeBarRef.current) {
      const clamped = Math.max(0, Math.min(1, ratio));
      activeBarRef.current.style.transform = `scaleX(${clamped})`;
    }
  }, []);

  const goToSlide = useCallback(
    (nextIndex: number) => {
      const normalized = ((nextIndex % STORY_COUNT) + STORY_COUNT) % STORY_COUNT;
      elapsedMsRef.current = 0;
      setBarScale(prefersReducedMotion ? 1 : 0);
      setActiveSlide(normalized);
    },
    [prefersReducedMotion, setBarScale],
  );

  useEffect(() => {
    elapsedMsRef.current = 0;
    setBarScale(prefersReducedMotion ? 1 : 0);
  }, [activeSlide, prefersReducedMotion, setBarScale]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsInView(entry.isIntersecting);
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shouldPauseTimer =
    Boolean(prefersReducedMotion) ||
    dismissed ||
    paused ||
    !isInView ||
    isHolding;

  useAnimationFrame((_, delta) => {
    if (shouldPauseTimer) return;

    elapsedMsRef.current += Math.min(delta, 100);
    const ratio = elapsedMsRef.current / STORY_DURATION_MS;

    if (ratio >= 1) {
      elapsedMsRef.current = 0;
      setActiveSlide((prev) => (prev + 1) % STORY_COUNT);
      return;
    }

    setBarScale(ratio);
  });

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const isInteractive = Boolean(target?.closest("[data-story-interactive]"));
    pointerDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      interactive: isInteractive,
    };
    setIsHolding(true);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    setIsHolding(false);

    if (!start || start.interactive) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const elapsed = Date.now() - start.time;

    // Horizontal swipe advances or rewinds story slides
    if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      if (dx < 0) {
        goToSlide(activeSlide + 1);
      } else {
        goToSlide(activeSlide - 1);
      }
      return;
    }

    // Quick edge tap (left third = previous, right two-thirds = next); long hold simply unpauses
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && elapsed < 450) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = e.clientX - rect.left;
      if (relX < rect.width * 0.32) {
        goToSlide(activeSlide - 1);
      } else {
        goToSlide(activeSlide + 1);
      }
    }
  };

  const handlePointerCancel = () => {
    pointerDownRef.current = null;
    setIsHolding(false);
  };

  const handleDockClick = () => {
    if (activeSlide === 0) {
      onTriggerAction({ kind: "cold-start" });
    } else if (activeSlide === 1) {
      onTriggerAction({ kind: "prompt", prompt: STATEMENT_PROMPT });
    } else if (activeSlide === 2) {
      onTriggerAction({ kind: "outfit" });
    } else {
      onTriggerAction({ kind: "compare", pair: STORIES_COMPARE_PAIR });
    }
  };

  const [compareBagA, compareBagB] = STORIES_COMPARE_PAIR;

  return (
    <Box
      as="section"
      aria-label="Ask Coach AI stories spotlight"
      className={clsx(
        "disclosure-grid w-full motion-reduce:transition-none",
        dismissed ? "disclosure-closed" : "disclosure-open",
      )}
    >
      <Box className="overflow-hidden min-h-0" inert={dismissed || undefined}>
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
          className="w-full h-701 overflow-hidden bg-surface-sheet isolate stack-grid cursor-pointer"
        >
          {/* Layer 0: Textured bronze/champagne-taupe background + light streak */}
          <Layer className="w-full h-701 pointer-events-none stack-grid overflow-hidden z-0">
            <img
              src="/assets/figma/sheet-bg.png"
              alt=""
              className="stack-cell z-0 w-full h-701 object-cover scale-105"
            />
            <Box className="stack-cell z-10 w-full h-701 sheet-radial-sheen mix-blend-plus-lighter" />
            <img
              src="/assets/figma/stories-light-streak.svg"
              alt=""
              className="stack-cell z-10 self-center w-full h-auto max-w-none opacity-90 mix-blend-plus-lighter"
            />
            {/* z-20: scale/blend on siblings create stacking contexts that otherwise bury this 40% black wash */}
            <Box className="stack-cell z-20 w-full h-701 bg-surface-sheet-wash" />
          </Layer>

          {/* Layer 1: Stories chrome, animated slide stage, and bottom CTA dock */}
          <Layer className="w-full h-701 flex flex-col justify-between z-10 min-w-0">
            {/* Upper 517px region: Stories progress bars + Ask Coach AI badge + active slide stage */}
            <Stack className="w-full flex-1 min-h-0 justify-between pt-24 pb-24 px-24">
              {/* Top Stories Progress Bars + Ask Coach AI Branding */}
              <Stack className="w-full gap-20 shrink-0">
                <Box
                  role="tablist"
                  aria-label="Coach AI story slides"
                  className="flex flex-row gap-5 w-full"
                >
                  {[0, 1, 2, 3].map((idx) => {
                    const isCompleted = idx < activeSlide;
                    const isActive = idx === activeSlide;

                    return (
                      <button
                        key={idx}
                        type="button"
                        role="tab"
                        data-story-interactive="true"
                        aria-selected={isActive}
                        aria-label={`Story ${idx + 1} of ${STORY_COUNT}`}
                        onClick={() => goToSlide(idx)}
                        className="flex-1 min-w-0 py-8 -my-8 flex items-center cursor-pointer"
                      >
                        <Box className="w-full h-3 rounded-pill bg-surface/30 overflow-hidden">
                          {isCompleted ? (
                            <Box className="w-full h-full bg-surface" />
                          ) : isActive ? (
                            <div
                              ref={activeBarRef}
                              className={clsx(
                                "w-full h-full bg-surface origin-left",
                                prefersReducedMotion ? "scale-x-100" : "scale-x-0",
                              )}
                            />
                          ) : null}
                        </Box>
                      </button>
                    );
                  })}
                </Box>

                <Cluster className="gap-5">
                  <Box className="w-20 h-20 rounded-pill bg-surface flex items-center justify-center shrink-0">
                    <img
                      src="/assets/figma/sparkle-badge-12.svg"
                      alt=""
                      width={12}
                      height={12}
                      className="w-12 h-12"
                    />
                  </Box>
                  <span className="text-body text-ink-inverse tracking-xs pt-3 whitespace-nowrap">
                    Ask Coach AI
                  </span>
                </Cluster>
              </Stack>

              {/* Middle Stage: 4 Contextual Story Demos */}
              <LayerGrid className="w-full flex-1 min-h-0 items-end pt-16 overflow-visible">
                <AnimatePresence mode="wait" initial={false}>
                  {activeSlide === 0 && (
                    <motion.div
                      key="story-slide-0"
                      variants={prefersReducedMotion ? undefined : slideContentVariants}
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0, transition: { duration: 0 } }
                          : "exit"
                      }
                      className="stack-cell self-end w-full min-w-0 pb-32 flex flex-col gap-20"
                    >
                      <h2 className="text-heading text-ink-inverse tracking-xs font-normal text-balance m-0">
                        Let our AI Expert help you find exactly what you need
                      </h2>

                      <div
                        data-story-interactive="true"
                        className="-mx-24 px-24 flex flex-row gap-10 overflow-x-auto no-scrollbar items-stretch"
                      >
                        {STORIES_STARTER_CARDS.map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() =>
                              onTriggerAction({ kind: "prompt", prompt: card.prompt })
                            }
                            className="shrink-0 p-13 rounded-tile border border-border-glass bg-surface-tile hover:bg-surface-tile-hover text-ink-inverse flex flex-col items-start justify-between gap-30 text-left press-scale motion-reduce:transition-none"
                          >
                            <img
                              src="/assets/figma/icon-ai-white.svg"
                              alt=""
                              width={20}
                              height={20}
                              className="w-20 h-20 shrink-0"
                            />
                            <span className="text-subhead tracking-sm leading-snug whitespace-nowrap">
                              {card.lines[0]}
                              <br />
                              {card.lines[1]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeSlide === 1 && (
                    <motion.div
                      key="story-slide-1"
                      variants={prefersReducedMotion ? undefined : slideContentVariants}
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0, transition: { duration: 0 } }
                          : "exit"
                      }
                      className="stack-cell self-end w-full min-w-0 flex flex-col gap-24"
                    >
                      <Stack className="w-full gap-12 items-end">
                        <Box className="bg-surface text-ink p-8 rounded-tl-bubble rounded-bl-bubble rounded-br-bubble rounded-tr-sharp shadow-bubble w-181 max-w-full">
                          <p className="text-caption tracking-xs text-balance m-0">
                            Hey @CoachAI, which of these bags....
                          </p>
                        </Box>

                        <Stack className="w-full gap-10 items-center">
                          <div
                            data-story-interactive="true"
                            className="-mx-24 px-24 w-screen max-w-430 flex flex-row gap-10 justify-center overflow-x-auto no-scrollbar items-stretch"
                          >
                            {STORIES_STARTER_CARDS.map((card) => {
                              const isHighlighted = card.id === "statement";
                              return (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() =>
                                    onTriggerAction({
                                      kind: "prompt",
                                      prompt: card.prompt,
                                    })
                                  }
                                  className={clsx(
                                    "shrink-0 p-13 rounded-tile border border-border-glass flex flex-col items-start justify-between gap-30 text-left press-scale motion-reduce:transition-none",
                                    isHighlighted
                                      ? "bg-surface text-ink shadow-bubble"
                                      : "bg-surface-tile hover:bg-surface-tile-hover text-ink-inverse",
                                  )}
                                >
                                  <img
                                    src={
                                      isHighlighted
                                        ? "/assets/figma/icon-ai-black.svg"
                                        : "/assets/figma/icon-ai-white.svg"
                                    }
                                    alt=""
                                    width={20}
                                    height={20}
                                    className="w-20 h-20 shrink-0"
                                  />
                                  <span className="text-subhead tracking-sm leading-snug whitespace-nowrap">
                                    {card.lines[0]}
                                    <br />
                                    {card.lines[1]}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <span className="text-micro text-ink-inverse text-center">
                            Pick an option to keep chatting
                          </span>
                        </Stack>
                      </Stack>

                      <Stack className="self-start items-start gap-5">
                        <span className="text-micro text-ink-inverse">Coach AI</span>
                        <Box className="bg-surface text-ink p-8 rounded-bubble shadow-bubble w-212 max-w-full">
                          <p className="text-caption tracking-xs text-balance m-0">
                            Refining the results to show bags that make a statement
                          </p>
                        </Box>
                        <StoryTypingDots />
                      </Stack>
                    </motion.div>
                  )}

                  {activeSlide === 2 && (
                    <motion.div
                      key="story-slide-2"
                      variants={prefersReducedMotion ? undefined : slideContentVariants}
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0, transition: { duration: 0 } }
                          : "exit"
                      }
                      className="stack-cell self-end w-full min-w-0 flex flex-col gap-12 pb-6"
                    >
                      <Box className="w-full pl-32">
                        <h2 className="max-w-306 text-title text-ink-inverse tracking-sm font-normal text-balance m-0">
                          Let our AI Expert
                          <br />
                          help you find exactly what you need
                        </h2>
                      </Box>

                      <LayerGrid className="w-full h-264">
                        <Layer className="justify-self-center self-start w-180 h-250 bg-surface-portrait overflow-hidden image-outline stack-grid pointer-events-none">
                          <img
                            src="/assets/figma/ad-swoop.svg"
                            alt=""
                            className="stack-cell w-288 h-169 -mt-35 -ml-20 max-w-none"
                          />
                          <img
                            src="/assets/figma/ad-model.png"
                            alt="Model holding Coach handbag"
                            className="stack-cell w-180 h-250 object-cover"
                          />
                        </Layer>

                        <Layer className="justify-self-end self-start mt-34 bg-surface text-ink p-8 rounded-tl-bubble rounded-bl-bubble rounded-br-bubble rounded-tr-sharp shadow-bubble w-181 max-w-full z-10 pointer-events-none">
                          <p className="text-caption tracking-xs text-balance m-0">
                            Hey @CoachAI, use this selfie to....
                          </p>
                        </Layer>

                        <Layer className="justify-self-start self-end flex flex-col items-start gap-5 z-10 pointer-events-none">
                          <span className="text-micro text-ink-inverse">Coach AI</span>
                          <Box className="bg-surface text-ink p-8 rounded-bubble shadow-bubble w-212 max-w-full">
                            <p className="text-caption tracking-xs text-balance m-0">
                              Searching through the results to find a match for your
                              outfit
                            </p>
                          </Box>
                          <StoryTypingDots />
                        </Layer>
                      </LayerGrid>
                    </motion.div>
                  )}

                  {activeSlide === 3 && (
                    <motion.div
                      key="story-slide-3"
                      variants={prefersReducedMotion ? undefined : slideContentVariants}
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0, transition: { duration: 0 } }
                          : "exit"
                      }
                      className="stack-cell self-end w-full min-w-0 flex flex-col gap-10 items-end"
                    >
                      <Box className="bg-surface text-ink p-8 rounded-tl-bubble rounded-bl-bubble rounded-br-bubble rounded-tr-sharp shadow-bubble w-181 max-w-full">
                        <p className="text-caption tracking-xs text-balance m-0">
                          Hey @CoachAI, help me compare these bags
                        </p>
                      </Box>

                      <LayerGrid className="w-full overflow-visible">
                        <Layer
                          data-story-interactive="true"
                          className="flex flex-row gap-20 justify-center items-end w-full"
                        >
                          {/* Left Compare Card: Juliet 25 */}
                          <Stack className="w-151 min-w-0 gap-8 items-start">
                            <button
                              type="button"
                              onClick={() =>
                                onTriggerAction({
                                  kind: "compare",
                                  pair: STORIES_COMPARE_PAIR,
                                })
                              }
                              className="flex flex-row items-center gap-2 text-caption text-ink-inverse tracking-xs press-scale motion-reduce:transition-none"
                            >
                              <span className="pt-2 whitespace-nowrap">
                                Compare materials
                              </span>
                              <img
                                src="/assets/figma/icon-arrow-up-white.svg"
                                alt=""
                                width={18}
                                height={18}
                                className="w-18 h-18 rotate-180 shrink-0"
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onTriggerAction({
                                  kind: "compare",
                                  pair: STORIES_COMPARE_PAIR,
                                })
                              }
                              className="w-full bg-surface overflow-hidden flex flex-col text-left shadow-bubble press-scale motion-reduce:transition-none"
                            >
                              <LayerGrid className="w-full aspect-slot-card bg-surface-muted overflow-hidden">
                                <img
                                  src={compareBagA.image}
                                  alt={compareBagA.name}
                                  className="stack-cell w-full h-full object-cover"
                                />
                              </LayerGrid>
                              <img
                                src="/assets/figma/card-slider-bar.svg"
                                alt=""
                                className="w-full h-2 object-cover"
                              />
                              <Stack className="p-10 gap-4 bg-surface w-full min-w-0">
                                <p className="text-caption text-ink truncate m-0">
                                  {compareBagA.name}
                                </p>
                                <p className="text-caption text-ink tabular-nums m-0">
                                  {compareBagA.priceFormatted}
                                </p>
                              </Stack>
                            </button>
                          </Stack>

                          {/* Right Compare Card: Tabby 26 */}
                          <Stack className="w-151 min-w-0 gap-8 items-end">
                            <button
                              type="button"
                              onClick={() =>
                                onTriggerAction({
                                  kind: "compare",
                                  pair: STORIES_COMPARE_PAIR,
                                })
                              }
                              className="text-caption text-ink-inverse tracking-xs underline pt-2 press-scale motion-reduce:transition-none"
                            >
                              Switch
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onTriggerAction({
                                  kind: "compare",
                                  pair: STORIES_COMPARE_PAIR,
                                })
                              }
                              className="w-full bg-surface overflow-hidden flex flex-col text-left shadow-bubble press-scale motion-reduce:transition-none"
                            >
                              <LayerGrid className="w-full aspect-slot-card bg-surface-muted overflow-hidden">
                                <img
                                  src={compareBagB.image}
                                  alt={compareBagB.name}
                                  className="stack-cell w-full h-full object-cover"
                                />
                              </LayerGrid>
                              <img
                                src="/assets/figma/card-slider-bar.svg"
                                alt=""
                                className="w-full h-2 object-cover"
                              />
                              <Stack className="p-10 gap-4 bg-surface w-full min-w-0">
                                <p className="text-caption text-ink truncate m-0">
                                  {compareBagB.name}
                                </p>
                                <p className="text-caption text-ink tabular-nums m-0">
                                  {compareBagB.priceFormatted}
                                </p>
                              </Stack>
                            </button>
                          </Stack>
                        </Layer>

                        {/* Material Callout: Left (Quilted Leather) */}
                        <Layer className="justify-self-start self-center -ml-10 -mt-20 z-10 pointer-events-none flex flex-col items-end gap-3">
                          <Stack className="bg-ink border border-border-glass rounded-bubble p-8 gap-2 shadow-bubble">
                            <span className="text-caption text-ink-inverse-muted tracking-xs">
                              Material
                            </span>
                            <span className="text-caption text-ink-inverse tracking-xs whitespace-nowrap">
                              Quilted Leather
                            </span>
                          </Stack>
                          <span className="size-8 rounded-pill bg-surface-orb border border-border-glass -mr-2" />
                        </Layer>

                        {/* Material Callout: Right (Soft Leather) */}
                        <Layer className="justify-self-end self-end -mr-10 mb-64 z-10 pointer-events-none flex flex-col items-start gap-3">
                          <span className="size-8 rounded-pill bg-surface-orb border border-border-glass -ml-2" />
                          <Stack className="bg-ink border border-border-glass rounded-bubble p-8 gap-2 shadow-bubble">
                            <span className="text-caption text-ink-inverse-muted tracking-xs">
                              Material
                            </span>
                            <span className="text-caption text-ink-inverse tracking-xs whitespace-nowrap">
                              Soft Leather
                            </span>
                          </Stack>
                        </Layer>
                      </LayerGrid>
                    </motion.div>
                  )}
                </AnimatePresence>
              </LayerGrid>
            </Stack>

            {/* Bottom Rounded Story CTA / Prompt Dock */}
            <button
              type="button"
              data-story-interactive="true"
              data-stories-cta="true"
              onClick={handleDockClick}
              className="w-full bg-surface-dock border-t border-x border-border-dock rounded-t-dock backdrop-blur-subtle px-20 pt-28 pb-20 flex flex-col gap-24 text-left shrink-0 press-scale motion-reduce:transition-none"
            >
              <LayerGrid className="w-full min-h-42 items-center">
                <AnimatePresence mode="wait" initial={false}>
                  {activeSlide === 0 && (
                    <motion.div
                      key="dock-copy-0"
                      variants={prefersReducedMotion ? undefined : slideContentVariants}
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0, transition: { duration: 0 } }
                          : "exit"
                      }
                      className="stack-cell w-full"
                    >
                      <p className="text-body text-ink-inverse tracking-xs m-0">
                        Ask our AI a question or
                        <br />
                        describe what you are looking for
                      </p>
                    </motion.div>
                  )}

                  {activeSlide === 1 && (
                    <motion.div
                      key="dock-copy-1"
                      variants={prefersReducedMotion ? undefined : slideContentVariants}
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0, transition: { duration: 0 } }
                          : "exit"
                      }
                      className="stack-cell w-full"
                    >
                      <Cluster className="flex-wrap gap-5 items-center w-full">
                        <span className="text-body text-ink-inverse tracking-xs pt-2">
                          Tap to ask
                        </span>
                        <CoachAiMentionPill />
                        <span className="text-body text-ink-inverse tracking-xs pt-2">
                          to find a bag within
                        </span>
                        <span className="text-body text-ink-inverse tracking-xs pt-2">
                          this search that makes a statement
                        </span>
                      </Cluster>
                    </motion.div>
                  )}

                  {activeSlide === 2 && (
                    <motion.div
                      key="dock-copy-2"
                      variants={prefersReducedMotion ? undefined : slideContentVariants}
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0, transition: { duration: 0 } }
                          : "exit"
                      }
                      className="stack-cell w-full"
                    >
                      <Cluster className="flex-wrap gap-5 items-center w-full">
                        <span className="text-body text-ink-inverse tracking-xs pt-2">
                          Tap to chat with
                        </span>
                        <CoachAiMentionPill />
                        <span className="text-body text-ink-inverse tracking-xs pt-2">
                          and upload a selfie
                        </span>
                        <span className="text-body text-ink-inverse tracking-xs pt-2">
                          so the assistant can find a perfect match
                        </span>
                      </Cluster>
                    </motion.div>
                  )}

                  {activeSlide === 3 && (
                    <motion.div
                      key="dock-copy-3"
                      variants={prefersReducedMotion ? undefined : slideContentVariants}
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "visible"}
                      exit={
                        prefersReducedMotion
                          ? { opacity: 0, transition: { duration: 0 } }
                          : "exit"
                      }
                      className="stack-cell w-full"
                    >
                      <Cluster className="flex-wrap gap-5 items-center w-full">
                        <span className="text-body text-ink-inverse tracking-xs pt-2">
                          Tap to ask
                        </span>
                        <CoachAiMentionPill />
                        <span className="text-body text-ink-inverse tracking-xs pt-2">
                          to find and compare two
                        </span>
                        <span className="text-body text-ink-inverse tracking-xs pt-2">
                          bags by material and more
                        </span>
                      </Cluster>
                    </motion.div>
                  )}
                </AnimatePresence>
              </LayerGrid>

              <Box className="w-full flex justify-end">
                <SendArrowPill />
              </Box>
            </button>
          </Layer>
        </div>

        <Cluster className="w-full pt-4 pb-8 px-10 justify-center bg-surface">
          <button
            type="button"
            onClick={onDismiss}
            className="text-micro text-ink-muted tracking-xs underline press-scale min-h-36 px-16 flex items-center justify-center"
          >
            Dismiss
          </button>
        </Cluster>
      </Box>
    </Box>
  );
}
