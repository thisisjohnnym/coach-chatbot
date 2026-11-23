import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import {
  CONTENT_SPOT_AD_LAYOUT,
  DEFAULT_RECENT_COMPARE_BAGS,
  STATEMENT_CAROUSEL_BAGS,
  getCompareSpotCopy,
  getContentSpotAdCopy,
  type BagProduct,
  type ContentSpotMode,
} from "../data/catalog";
import { blurScaleVariants } from "../motion/presets";
import { Box, Cluster, Layer, LayerGrid, Stack } from "../primitives/Layout";

export interface ContentSpotAdProps {
  mode: ContentSpotMode;
  dismissed: boolean;
  recentComparePair?: [BagProduct, BagProduct];
  onOpenAssistant: (mode: ContentSpotMode, prompt?: string) => void;
  /** @deprecated Dismiss control removed from the ad UI. */
  onDismiss?: () => void;
}

function DemoChatAdBody({
  mode,
  recentComparePair,
  onOpenAssistant,
}: {
  mode: ContentSpotMode;
  recentComparePair: [BagProduct, BagProduct];
  onOpenAssistant: (mode: ContentSpotMode, prompt?: string) => void;
}) {
  const compareCopy = getCompareSpotCopy(recentComparePair);

  const userMessage =
    mode === "general"
      ? "Help me find something that matches..."
      : mode === "compare"
        ? compareCopy.userPrompt
        : "Show me something that makes a statement";

  const assistantMessage =
    mode === "general"
      ? "Searching for..."
      : mode === "compare"
        ? compareCopy.assistantPreview
        : "Finding statement making shoulder bags...";

  const bubbleMotionKey =
    mode === "compare"
      ? `compare-${recentComparePair[0].id}-${recentComparePair[1].id}`
      : mode;

  return (
    <LayerGrid className="w-full h-460 overflow-hidden">
      <Layer className="w-full h-460">
        <img
          src="/assets/figma/ad-bg.png"
          alt=""
          className="w-full h-460 object-cover pointer-events-none"
        />
      </Layer>

      <Layer className="flex flex-col items-center justify-between px-20 py-30 h-460 z-10">
        <h2 className="w-full max-w-306 text-center text-title text-ink-inverse tracking-sm text-balance">
          Let our AI Expert
          <br />
          help you find exactly what you need
        </h2>

        <LayerGrid className="w-180 max-w-full h-250 bg-surface-portrait overflow-hidden image-outline">
          <img
            src="/assets/figma/ad-swoop.svg"
            alt=""
            className="stack-cell w-288 h-169 -mt-35 -ml-20 max-w-none pointer-events-none"
          />
          <img
            src="/assets/figma/ad-model.png"
            alt="Model holding Coach handbag"
            className="stack-cell w-180 h-250 object-cover pointer-events-none"
          />
        </LayerGrid>

        <Cluster className="h-38 justify-center">
          <button
            type="button"
            data-spot-cta="true"
            onClick={() => onOpenAssistant(mode)}
            className="bg-surface text-ink rounded-pill px-14 py-10 h-38 flex flex-row items-center gap-5 shadow-bubble press-scale"
          >
            <img
              src="/assets/figma/sparkle-black.svg"
              alt=""
              width={16}
              height={16}
              className="w-16 h-16 shrink-0"
            />
            <span className="text-caption tracking-xs text-ink pt-1 whitespace-nowrap">
              Ask Coach AI
            </span>
          </button>
        </Cluster>
      </Layer>

      <Layer className="pointer-events-none w-full h-460 flex flex-col items-stretch z-20">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={bubbleMotionKey}
            variants={blurScaleVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full h-460 flex flex-col items-stretch"
          >
            <Box
              className={clsx(
                "self-end ml-16 mr-20 mt-157 bg-surface p-8 rounded-tl-bubble rounded-bl-bubble rounded-br-bubble rounded-tr-sharp shadow-bubble",
                mode === "compare"
                  ? "max-w-196 flex flex-row items-center gap-6"
                  : "w-181 max-w-full",
              )}
            >
              {mode === "compare" && (
                <img
                  src="/assets/figma/icon-compare-bubble.svg"
                  alt=""
                  width={14}
                  height={14}
                  className="w-14 h-14 shrink-0"
                />
              )}
              <p className="text-caption text-ink text-balance m-0">
                {userMessage}
              </p>
            </Box>

            <Stack
              className={clsx(
                "self-start mr-16 mt-40 items-start gap-5 max-w-full min-w-0",
                mode === "general" ? "ml-56" : "ml-32"
              )}
            >
              <span className="text-micro text-ink-inverse">Coach AI</span>

              <Box className="max-w-full bg-surface p-8 rounded-bubble shadow-bubble">
                <p
                  className={clsx(
                    "text-caption text-ink m-0",
                    mode === "general" ? "whitespace-nowrap" : "max-w-196"
                  )}
                >
                  {assistantMessage}
                </p>
              </Box>

              <Cluster className="bg-surface rounded-pill h-22 px-8 gap-4 shadow-bubble">
                <span className="size-4 bg-ink rounded-pill animate-dot-1" />
                <span className="size-4 bg-ink rounded-pill animate-dot-2" />
                <span className="size-4 bg-ink rounded-pill animate-dot-3" />
              </Cluster>
            </Stack>
          </motion.div>
        </AnimatePresence>
      </Layer>
    </LayerGrid>
  );
}

function PromptCardsAdBody({
  mode,
  recentComparePair,
  onOpenAssistant,
}: {
  mode: ContentSpotMode;
  recentComparePair: [BagProduct, BagProduct];
  onOpenAssistant: (mode: ContentSpotMode, prompt?: string) => void;
}) {
  const adCopy = getContentSpotAdCopy(mode, recentComparePair);
  // Figma assistant ad 2219:49477 shows two floating prompt bubbles over the portrait.
  const floatingPrompts = adCopy.prompts.slice(0, 2);
  // Figma bag was a placeholder — lifestyle for general; scenario bag otherwise.
  const heroImage =
    mode === "general"
      ? {
          src: "/assets/figma/ad-model.png",
          alt: "Model holding Coach handbag",
        }
      : mode === "compare"
        ? {
            src: recentComparePair[0].image,
            alt: recentComparePair[0].name,
          }
        : {
            src: STATEMENT_CAROUSEL_BAGS[0].image,
            alt: STATEMENT_CAROUSEL_BAGS[0].name,
          };
  const promptMotionKey =
    mode === "compare"
      ? `prompts-compare-${recentComparePair[0].id}-${recentComparePair[1].id}`
      : `prompts-${mode}`;

  return (
    <LayerGrid className="w-full h-482 overflow-hidden">
      <Layer className="w-full h-482 pointer-events-none">
        <img
          src="/assets/figma/ad-bg.png"
          alt=""
          className="w-full h-482 object-cover"
        />
      </Layer>

      <Layer className="flex flex-col items-center justify-between px-20 py-30 h-482 z-10">
        <h2 className="w-full max-w-306 text-center text-title text-ink-inverse tracking-sm text-balance m-0">
          {adCopy.headlineLines[0]}
          <br />
          {adCopy.headlineLines[1]}
        </h2>

        <LayerGrid className="w-213 h-296 bg-surface-portrait overflow-hidden pointer-events-none">
          <img
            key={heroImage.src}
            src={heroImage.src}
            alt={heroImage.alt}
            className="stack-cell w-213 h-296 object-cover"
          />
        </LayerGrid>

        <Cluster className="justify-center">
          <button
            type="button"
            data-spot-cta="true"
            onClick={() => onOpenAssistant(mode)}
            className="bg-surface text-ink rounded-pill p-10 flex flex-row items-center gap-4 press-scale motion-reduce:transition-none"
          >
            <img
              src="/assets/figma/sparkle-black.svg"
              alt=""
              width={16}
              height={16}
              className="w-16 h-16 shrink-0"
            />
            <span className="text-caption tracking-xs text-ink pt-3 whitespace-nowrap">
              Ask Coach AI
            </span>
          </button>
        </Cluster>
      </Layer>

      <Layer className="pointer-events-none w-full h-482 z-20">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={promptMotionKey}
            variants={blurScaleVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full h-482 px-20 pt-148 pointer-events-none flex flex-row items-start justify-between gap-12"
          >
            {floatingPrompts[0] && (
              <button
                type="button"
                onClick={() => onOpenAssistant(mode, floatingPrompts[0])}
                className="pointer-events-auto flex-1 min-w-0 max-w-181 bg-surface p-8 rounded-bubble shadow-ad-prompt flex flex-col items-start gap-10 text-left press-scale motion-reduce:transition-none"
              >
                <img
                  src="/assets/figma/sparkle-black.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="w-16 h-16 shrink-0"
                />
                <span className="w-full text-caption text-ink tracking-xs text-balance">
                  {floatingPrompts[0]}
                </span>
              </button>
            )}

            {floatingPrompts[1] && (
              <button
                type="button"
                onClick={() => onOpenAssistant(mode, floatingPrompts[1])}
                className="pointer-events-auto flex-1 min-w-0 max-w-181 mt-72 bg-surface p-8 rounded-bubble shadow-ad-prompt flex flex-col items-start gap-10 text-left press-scale motion-reduce:transition-none"
              >
                <img
                  src="/assets/figma/sparkle-black.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="w-16 h-16 shrink-0"
                />
                <span className="w-full text-caption text-ink tracking-xs text-balance">
                  {floatingPrompts[1]}
                </span>
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </Layer>
    </LayerGrid>
  );
}

export function ContentSpotAd({
  mode,
  dismissed,
  recentComparePair = DEFAULT_RECENT_COMPARE_BAGS,
  onOpenAssistant,
}: ContentSpotAdProps) {
  return (
    <Box
      as="section"
      aria-label="Ask Coach AI spotlight"
      className={clsx(
        "disclosure-grid w-full motion-reduce:transition-none",
        dismissed ? "disclosure-closed" : "disclosure-open"
      )}
    >
      <Box className="overflow-hidden min-h-0" inert={dismissed || undefined}>
        {CONTENT_SPOT_AD_LAYOUT === "prompts" ? (
          <PromptCardsAdBody
            mode={mode}
            recentComparePair={recentComparePair}
            onOpenAssistant={onOpenAssistant}
          />
        ) : (
          <DemoChatAdBody
            mode={mode}
            recentComparePair={recentComparePair}
            onOpenAssistant={onOpenAssistant}
          />
        )}
      </Box>
    </Box>
  );
}
