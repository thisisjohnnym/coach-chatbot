import type { RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  DEFAULT_RECENT_COMPARE_BAGS,
  PLP_COMPARE_ROWS,
  PLP_ROWS,
  type BagProduct,
  type ContentSpotMode,
} from "../data/catalog";
import { contextualIconVariants } from "../motion/presets";
import { Box, Cluster, LayerGrid, Stack } from "../primitives/Layout";
import { ContentSpotAd } from "./ContentSpotAd";

export interface PlpListingProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  contentSpotMode: ContentSpotMode;
  contentSpotDismissed: boolean;
  bagCount?: number;
  recentComparePair?: [BagProduct, BagProduct];
  onOpenAssistant: (mode: ContentSpotMode) => void;
  onDismissContentSpot: () => void;
  onSelectBagFromGrid?: (bag: BagProduct) => void;
}

interface ProductTileProps {
  bag: BagProduct;
  showViewedBadge?: boolean;
  onSelect?: (bag: BagProduct) => void;
}

function ProductTile({
  bag,
  showViewedBadge = false,
  onSelect,
}: ProductTileProps) {
  return (
    <Stack
      as="article"
      onClick={onSelect ? () => onSelect(bag) : undefined}
      className="flex-1 min-w-0 bg-surface cursor-pointer"
    >
      <LayerGrid className="w-full h-257 bg-surface-muted overflow-hidden">
        <img
          src={bag.image}
          alt={bag.name}
          className="stack-cell w-full h-257 object-cover"
        />
        <AnimatePresence initial={false}>
          {showViewedBadge && (
            <motion.span
              key="viewed-badge"
              variants={contextualIconVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="stack-cell self-start justify-self-start m-8 px-8 py-3 rounded-pill bg-surface/90 backdrop-blur-subtle text-ink text-micro tracking-xs shadow-bubble pointer-events-none"
            >
              Viewed
            </motion.span>
          )}
        </AnimatePresence>
        <button
          type="button"
          aria-label={`Quick add ${bag.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(bag);
          }}
          className="stack-cell self-end justify-self-end w-36 h-36 flex items-center justify-center press-scale"
        >
          <img
            src="/assets/figma/card-plus.svg"
            alt=""
            width={24}
            height={24}
            className="w-24 h-24"
          />
        </button>
      </LayerGrid>

      <img
        src="/assets/figma/card-slider-bar.svg"
        alt=""
        className="w-full h-2 object-cover pointer-events-none"
      />

      <Stack className="p-12 gap-12 bg-surface">
        <LayerGrid className="w-full overflow-hidden">
          <p className="stack-cell min-w-0 text-caption font-medium text-ink-charcoal truncate pr-24">
            {bag.name}
          </p>
          <Box className="stack-cell justify-self-end w-30 h-20 name-fade-right pointer-events-none" />
        </LayerGrid>

        <img
          src="/assets/figma/card-swatch.svg"
          alt=""
          width={16}
          height={20}
          className="w-16 h-20"
        />

        <p className="text-caption text-ink tabular-nums">{bag.priceFormatted}</p>
      </Stack>
    </Stack>
  );
}

export function PlpListing({
  scrollRef,
  contentSpotMode,
  contentSpotDismissed,
  bagCount = 0,
  recentComparePair = DEFAULT_RECENT_COMPARE_BAGS,
  onOpenAssistant,
  onDismissContentSpot,
  onSelectBagFromGrid,
}: PlpListingProps) {
  const isCompareScenario = contentSpotMode === "compare";
  const activeRows = isCompareScenario ? PLP_COMPARE_ROWS : PLP_ROWS;
  const recentIds = isCompareScenario
    ? new Set([recentComparePair[0].id, recentComparePair[1].id])
    : null;
  const upperRows = activeRows.slice(0, 4);
  const lowerRows = activeRows.slice(4);

  return (
    <div
      ref={scrollRef}
      className="stack-cell h-full w-full overflow-y-auto no-scrollbar bg-surface pb-120"
    >
      {/* Top brand tab bar */}
      <Cluster className="bg-surface-tabs h-48 w-full px-10 pt-8 justify-between">
        <Cluster className="items-end">
          <LayerGrid
            as="button"
            type="button"
            aria-label="Coach"
            className="w-102 h-40 shrink-0 press-scale"
          >
            <img
              src="/assets/figma/retail-tab-bg.svg"
              alt=""
              width={102}
              height={40}
              className="stack-cell w-102 h-40 pointer-events-none"
            />
            <img
              src="/assets/figma/coach-logo.svg"
              alt="Coach"
              width={74}
              height={8}
              className="stack-cell place-self-center w-74 h-8 pointer-events-none"
            />
          </LayerGrid>

          <LayerGrid
            as="button"
            type="button"
            aria-label="Coach Outlet"
            className="w-152 h-40 shrink-0 press-scale"
          >
            <img
              src="/assets/figma/outlet-tab-bg.svg"
              alt=""
              width={152}
              height={40}
              className="stack-cell w-152 h-40 pointer-events-none"
            />
            <img
              src="/assets/figma/coach-outlet-logo.svg"
              alt="Coach Outlet"
              width={124}
              height={8}
              className="stack-cell place-self-center w-124 h-8 pointer-events-none"
            />
          </LayerGrid>
        </Cluster>

        <Cluster className="gap-4 pb-4 pr-2">
          <LayerGrid
            as="button"
            type="button"
            aria-label={
              bagCount > 0 ? `Shopping bag, ${bagCount} items` : "Shopping bag"
            }
            className="w-36 h-36 place-items-center press-scale motion-reduce:transition-none"
          >
            <img
              src="/assets/figma/icon-bag-white.svg"
              alt=""
              width={24}
              height={24}
              className="stack-cell w-24 h-24"
            />
            <AnimatePresence initial={false}>
              {bagCount > 0 && (
                <motion.span
                  key="bag-count-badge"
                  variants={contextualIconVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="stack-cell self-start justify-self-end mt-2 mr-1 min-w-16 h-16 px-4 rounded-pill bg-surface text-ink text-micro font-medium tabular-nums flex items-center justify-center"
                >
                  {bagCount}
                </motion.span>
              )}
            </AnimatePresence>
          </LayerGrid>
          <button
            type="button"
            aria-label="Navigation menu"
            className="w-36 h-36 flex items-center justify-center press-scale"
          >
            <img
              src="/assets/figma/icon-menu.svg"
              alt=""
              width={24}
              height={18}
              className="w-24 h-18"
            />
          </button>
        </Cluster>
      </Cluster>

      {/* Search bar */}
      <Box className="p-12 w-full bg-surface">
        <Cluster
          role="search"
          className="h-40 w-full rounded-pill border border-border-search px-16 gap-6"
        >
          <img
            src="/assets/figma/icon-search.svg"
            alt=""
            width={16}
            height={16}
            className="w-16 h-16 shrink-0"
          />
          <span className="text-caption text-ink font-medium">
            {isCompareScenario ? "Tabby" : "shoulder bags"}
          </span>
        </Cluster>
      </Box>

      {/* Search results headline */}
      <Box className="px-12 py-20 border-b border-border-subtle text-ink-primary">
        <h1 className="text-title font-medium tracking-tight-title">
          {isCompareScenario
            ? "24 results for Tabby"
            : "150 results for shoulder bags"}
        </h1>
      </Box>

      {/* Sticky filter bar — Safari 26 toolbar sampling: keep sticky host transparent and put fill/blur on absolute child */}
      <Cluster className="sticky top-0 z-10 bg-transparent px-12 py-6 justify-start">
        <Box
          aria-hidden="true"
          className="absolute inset-0 backdrop-blur-md bg-surface/95 border-b border-border-faint pointer-events-none"
        />
        <button
          type="button"
          className="z-10 min-h-36 flex flex-row items-center gap-6 press-scale text-ink"
        >
          <svg
            width={15}
            height={10}
            viewBox="0 0 15 10"
            fill="none"
            aria-hidden="true"
            className="w-15 h-10 shrink-0"
          >
            <line
              x1="0.5"
              y1="2.5"
              x2="14.5"
              y2="2.5"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle
              cx="5"
              cy="2.5"
              r="2"
              fill="var(--color-surface)"
              stroke="currentColor"
              strokeWidth="1"
            />
            <line
              x1="0.5"
              y1="7.5"
              x2="14.5"
              y2="7.5"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle
              cx="10"
              cy="7.5"
              r="2"
              fill="var(--color-surface)"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
          <span className="text-caption text-ink">Filter &amp; Sort</span>
        </button>
      </Cluster>

      {/* Rows 0–3 (first 8 handbags) */}
      <Stack className="w-full">
        {upperRows.map((row, rowIndex) => (
          <Box key={`upper-row-${rowIndex}`} className="flex flex-row gap-4 w-full">
            {row.map((bag) => (
              <ProductTile
                key={`upper-${rowIndex}-${bag.id}`}
                bag={bag}
                showViewedBadge={Boolean(recentIds?.has(bag.id))}
                onSelect={onSelectBagFromGrid}
              />
            ))}
          </Box>
        ))}
      </Stack>

      {/* Inline AI Content Spot banner after 8 products */}
      <ContentSpotAd
        mode={contentSpotMode}
        dismissed={contentSpotDismissed}
        recentComparePair={recentComparePair}
        onOpenAssistant={onOpenAssistant}
        onDismiss={onDismissContentSpot}
      />

      {/* Rows 4–6 below Content Spot */}
      <Stack className="w-full">
        {lowerRows.map((row, rowIndex) => (
          <Box key={`lower-row-${rowIndex}`} className="flex flex-row gap-4 w-full">
            {row.map((bag) => (
              <ProductTile
                key={`lower-${rowIndex}-${bag.id}`}
                bag={bag}
                showViewedBadge={Boolean(recentIds?.has(bag.id))}
                onSelect={onSelectBagFromGrid}
              />
            ))}
          </Box>
        ))}
      </Stack>
    </div>
  );
}
