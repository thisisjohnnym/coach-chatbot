import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import {
  CONTENT_SPOT_AD_LAYOUT,
  DEFAULT_RECENT_COMPARE_BAGS,
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
  onDismiss: () => void;
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
  const promptMotionKey =
    mode === "compare"
      ? `prompts-compare-${recentComparePair[0].id}-${recentComparePair[1].id}`
      : `prompts-${mode}`;

  // Updated Figma 2201:23482 — column stack: headline → portrait+cards → Ask Coach AI
  return (
    <LayerGrid className="w-full overflow-hidden">
      <Layer className="w-full overflow-hidden pointer-events-none">
        {/* h-0 min-h-full: fill the stack cell without the PNG intrinsic height blowing up the ad */}
        <img
          src="/assets/figma/ad-prompts-bg.png"
          alt=""
          className="w-full h-0 min-h-full object-cover"
        />
      </Layer>

      <Layer className="flex flex-col items-center gap-21 px-10 py-30 z-10">
        <h2 className="w-full max-w-306 text-center text-title text-ink-inverse tracking-sm text-balance m-0">
          {adCopy.headlineLines[0]}
          <br />
          {adCopy.headlineLines[1]}
        </h2>

        <LayerGrid className="w-full max-w-410 h-201 overflow-hidden">
          <Layer className="flex justify-center h-201 pointer-events-none">
            <LayerGrid className="w-346 max-w-full h-201 bg-surface-portrait overflow-hidden">
              <img
                src="/assets/figma/ad-model-wide.png"
                alt="Model holding Coach handbag"
                // design-system-escape: Figma crop anchors model slightly left of center in the 346×201 clip
                className="stack-cell w-full h-201 max-w-none object-cover object-[42%_42%] pointer-events-none"
              />
            </LayerGrid>
          </Layer>

          <Layer className="flex items-start justify-center pt-27 h-201 z-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={promptMotionKey}
                variants={blurScaleVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full flex flex-row gap-10 items-stretch"
              >
                {adCopy.prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onOpenAssistant(mode, prompt)}
                    className="flex-1 min-w-0 min-h-174 bg-surface border border-border-glass rounded-tile p-13 flex flex-col justify-between gap-30 text-left shadow-bubble press-scale motion-reduce:transition-none"
                  >
                    <img
                      src="/assets/figma/sparkle-ad-card.svg"
                      alt=""
                      width={20}
                      height={20}
                      className="w-20 h-20 shrink-0"
                    />
                    <span className="text-body text-ink tracking-xs text-balance">
                      {prompt}
                    </span>
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
          </Layer>
        </LayerGrid>

        <Cluster className="justify-center">
          <button
            type="button"
            data-spot-cta="true"
            onClick={() => onOpenAssistant(mode)}
            className="bg-surface text-ink rounded-pill px-14 py-10 flex flex-row items-center gap-4 shadow-bubble press-scale"
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
    </LayerGrid>
  );
}

export function ContentSpotAd({
  mode,
  dismissed,
  recentComparePair = DEFAULT_RECENT_COMPARE_BAGS,
  onOpenAssistant,
  onDismiss,
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
