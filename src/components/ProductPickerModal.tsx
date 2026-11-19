import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { BAG_CATALOG, type BagProduct } from "../data/catalog";
import {
  TRANSITION_PICKER_CLOSE,
  TRANSITION_PICKER_OPEN,
  TRANSITION_PICKER_SCRIM_OPEN,
  pickerCardVariants,
  pickerGridVariants,
} from "../motion/presets";
import { Box, Layer, LayerGrid, Stack } from "../primitives/Layout";

export interface ProductPickerModalProps {
  slot: "A" | "B";
  excludeBagId?: string;
  recentBags?: BagProduct[];
  onPickBag: (bag: BagProduct) => void;
  onClose: () => void;
}

type FilterKey = "recent" | "top" | "trending" | "foryou" | "all";

const FILTER_CHIPS: Array<{ id: FilterKey; label: string }> = [
  { id: "recent", label: "Recent search" },
  { id: "top", label: "Top sellers" },
  { id: "trending", label: "Trending" },
  { id: "foryou", label: "For You" },
  { id: "all", label: "All" },
];

function getOrderedBags(
  filter: FilterKey,
  recentBags?: BagProduct[],
): BagProduct[] {
  if (filter === "all") {
    return [...BAG_CATALOG, BAG_CATALOG[2], BAG_CATALOG[0], BAG_CATALOG[4]];
  }

  if (filter === "recent" && recentBags && recentBags.length > 0) {
    const mostRecentFirst = [...recentBags].reverse();
    const recentIds = new Set(mostRecentFirst.map((bag) => bag.id));
    const restRecent = BAG_CATALOG.filter(
      (bag) => bag.category === "recent" && !recentIds.has(bag.id),
    );
    const remaining = BAG_CATALOG.filter(
      (bag) => bag.category !== "recent" && !recentIds.has(bag.id),
    );
    return [
      ...mostRecentFirst,
      ...restRecent,
      ...remaining,
      BAG_CATALOG[0],
      BAG_CATALOG[4],
    ];
  }

  const primary = BAG_CATALOG.filter((bag) => bag.category === filter);
  const rest = BAG_CATALOG.filter((bag) => bag.category !== filter);
  const orderedSix = [...primary, ...rest];

  if (filter === "recent") {
    return [...orderedSix, BAG_CATALOG[0], BAG_CATALOG[4], BAG_CATALOG[1]];
  }

  return orderedSix;
}

export function ProductPickerModal({
  slot,
  excludeBagId,
  recentBags,
  onPickBag,
  onClose,
}: ProductPickerModalProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("recent");
  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrolledTop, setScrolledTop] = useState(0);
  const [canScrollDown, setCanScrollDown] = useState(true);

  const syncScrollMetrics = useCallback(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    const nextTop = el.scrollTop;
    const remaining = el.scrollHeight - nextTop - el.clientHeight;
    setScrolledTop(nextTop);
    setCanScrollDown(remaining > 8);
  }, []);

  const attachGridRef = useCallback(
    (node: HTMLDivElement | null) => {
      gridScrollRef.current = node;
      if (node) {
        syncScrollMetrics();
      }
    },
    [syncScrollMetrics],
  );

  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    syncScrollMetrics();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      syncScrollMetrics();
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [activeFilter, syncScrollMetrics]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const displayedBags = useMemo(
    () => getOrderedBags(activeFilter, recentBags),
    [activeFilter, recentBags],
  );

  const hasTopEdge = scrolledTop > 8;
  const hasBottomEdge = canScrollDown;
  const scrollMaskClass =
    hasTopEdge && hasBottomEdge
      ? "scroll-mask-both"
      : hasTopEdge
        ? "scroll-mask-top"
        : hasBottomEdge
          ? "scroll-mask-bottom"
          : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: TRANSITION_PICKER_SCRIM_OPEN }}
      exit={{ opacity: 0, pointerEvents: "none", transition: TRANSITION_PICKER_CLOSE }}
      onClick={onClose}
      className="stack-cell w-full h-full bg-surface-modal-scrim backdrop-blur-subtle px-16 py-12 flex items-center justify-center"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-picker-title"
        initial={{ opacity: 0, scale: 0.96, filter: "blur(4px)", y: 8 }}
        animate={{
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          y: 0,
          transition: TRANSITION_PICKER_OPEN,
        }}
        exit={{
          opacity: 0,
          scale: 0.97,
          filter: "blur(3px)",
          y: 6,
          transition: TRANSITION_PICKER_CLOSE,
        }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-390 max-h-full bg-surface rounded-tile overflow-hidden flex flex-col shadow-fab"
      >
        <Stack className="pt-18 pb-10 px-12 gap-8 bg-surface shrink-0">
          <Box className="flex flex-row items-start justify-between">
            <Stack className="gap-2">
              <span className="text-body text-ink tabular-nums">
                {slot === "A" ? "1/2" : "2/2"}
              </span>
              <h3
                id="product-picker-title"
                className="text-heading text-ink tracking-sm font-normal m-0"
              >
                Choosing product {slot}
              </h3>
            </Stack>

            <button
              type="button"
              onClick={onClose}
              className="w-36 h-36 rounded-pill flex items-center justify-center press-scale motion-reduce:transition-none hover:bg-surface-muted"
            >
              <img
                src="/assets/figma/icon-close-modal.svg"
                alt="Close product picker"
                width={24}
                height={24}
                className="w-24 h-24"
              />
            </button>
          </Box>

          <Stack className="gap-6">
            <span className="text-caption text-ink tracking-xs">
              Show products from:
            </span>
            <Box className="flex flex-row gap-5 overflow-x-auto no-scrollbar">
              {FILTER_CHIPS.map((chip) => {
                const isActive = activeFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveFilter(chip.id)}
                    className={clsx(
                      "h-36 px-12 rounded-pill text-caption tracking-xs whitespace-nowrap press-scale motion-reduce:transition-none flex items-center justify-center",
                      isActive
                        ? "bg-ink text-ink-inverse"
                        : "bg-surface text-ink border border-border-chip hover:bg-surface-muted",
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </Box>
          </Stack>
        </Stack>

        <LayerGrid className="min-h-0 overflow-hidden">
          <AnimatePresence>
            <motion.div
              key={activeFilter}
              ref={attachGridRef}
              onScroll={syncScrollMetrics}
              variants={pickerGridVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={clsx(
                "stack-cell grid grid-cols-3 gap-8 px-10 pb-16 pt-4 overflow-y-auto max-h-460",
                scrollMaskClass,
              )}
            >
              {displayedBags.map((bag, idx) => {
                const isExcluded = bag.id === excludeBagId;
                return (
                  <motion.button
                    key={`${bag.id}-${idx}`}
                    type="button"
                    variants={pickerCardVariants}
                    disabled={isExcluded}
                    onClick={() => {
                      if (!isExcluded) {
                        onPickBag(bag);
                      }
                    }}
                    className={clsx(
                      "min-w-0 bg-surface rounded-slot overflow-hidden flex flex-col text-left",
                      isExcluded
                        ? "cursor-not-allowed"
                        : "press-scale motion-reduce:transition-none",
                    )}
                  >
                    <Box
                      className={clsx(
                        "w-full flex flex-col",
                        isExcluded && "opacity-45",
                      )}
                    >
                      <LayerGrid className="w-full h-148 bg-surface-muted overflow-hidden">
                        <img
                          src={bag.image}
                          alt={bag.name}
                          className="stack-cell w-full h-148 object-cover"
                        />
                        {isExcluded && (
                          <Layer className="self-start justify-self-start m-4 px-6 py-2 rounded-slot bg-ink text-ink-inverse text-micro">
                            Picked
                          </Layer>
                        )}
                        <img
                          src="/assets/figma/card-plus.svg"
                          alt=""
                          width={20}
                          height={20}
                          className="stack-cell self-end justify-self-end w-20 h-20 m-2"
                        />
                      </LayerGrid>
                      <img
                        src="/assets/figma/card-slider-bar.svg"
                        alt=""
                        className="w-full h-2 object-cover"
                      />
                      <Stack className="pt-8 pb-4 px-4 gap-2 text-left w-full">
                        <p className="text-caption text-ink truncate m-0">
                          {bag.name}
                        </p>
                        <p className="text-caption text-ink tabular-nums m-0">
                          {bag.priceFormatted}
                        </p>
                      </Stack>
                    </Box>
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </LayerGrid>
      </motion.div>
    </motion.div>
  );
}
