import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { motion } from "motion/react";
import {
  BAG_CATALOG,
  DEFAULT_RECENT_COMPARE_BAGS,
  type BagProduct,
} from "../data/catalog";
import {
  TRANSITION_PICKER_CLOSE,
  TRANSITION_PICKER_OPEN,
  TRANSITION_PICKER_SCRIM_OPEN,
  pickerCardVariants,
  pickerGridVariants,
} from "../motion/presets";
import { Box, Cluster, Layer, LayerGrid, Stack } from "../primitives/Layout";

export interface ProductPickerModalProps {
  slot?: "A" | "B";
  excludeBagId?: string;
  recentBags?: BagProduct[];
  onPickBag: (bag: BagProduct) => void;
  onClose: () => void;
}

type PickerBadge = "Picked" | "Viewed" | "Recommended";

interface PickerGridItem {
  bag: BagProduct;
  badge: PickerBadge;
}

const TARGET_GRID_COUNT = 6;

function getCuratedPickerItems(
  excludeBagId?: string,
  recentBags: BagProduct[] = DEFAULT_RECENT_COMPARE_BAGS,
): PickerGridItem[] {
  const items: PickerGridItem[] = [];
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();

  const addItem = (bag: BagProduct, badge: PickerBadge) => {
    items.push({ bag, badge });
    seenIds.add(bag.id);
    seenImages.add(bag.image);
  };

  if (excludeBagId) {
    const pickedBag = BAG_CATALOG.find((bag) => bag.id === excludeBagId);
    if (pickedBag) {
      addItem(pickedBag, "Picked");
    }
  }

  const mostRecentFirst = [...recentBags].reverse();
  for (const bag of mostRecentFirst) {
    if (!seenIds.has(bag.id) && items.length < TARGET_GRID_COUNT) {
      addItem(bag, "Viewed");
    }
  }

  for (const bag of BAG_CATALOG) {
    if (items.length >= TARGET_GRID_COUNT) break;
    if (!seenIds.has(bag.id) && !seenImages.has(bag.image)) {
      addItem(bag, "Recommended");
    }
  }

  for (const bag of BAG_CATALOG) {
    if (items.length >= TARGET_GRID_COUNT) break;
    if (!seenIds.has(bag.id)) {
      addItem(bag, "Recommended");
    }
  }

  return items;
}

export function ProductPickerModal({
  excludeBagId,
  recentBags,
  onPickBag,
  onClose,
}: ProductPickerModalProps) {
  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrolledTop, setScrolledTop] = useState(0);
  const [canScrollDown, setCanScrollDown] = useState(false);

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

  const curatedItems = useMemo(
    () => getCuratedPickerItems(excludeBagId, recentBags),
    [excludeBagId, recentBags],
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
  }, [curatedItems, syncScrollMetrics]);

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
      className="stack-cell w-full h-full min-h-0 bg-surface-modal-scrim backdrop-blur-subtle px-16 pt-16 pb-safe-modal flex items-center justify-center overflow-hidden"
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
        className="w-full max-w-390 max-h-modal min-w-0 min-h-0 bg-surface rounded-tile overflow-hidden flex flex-col shadow-fab"
      >
        <Cluster className="pt-14 pb-10 px-14 gap-8 justify-between bg-surface shrink-0 min-w-0">
          <h3
            id="product-picker-title"
            className="text-title text-ink tracking-tight-title font-normal text-balance m-0 min-w-0"
          >
            Select a product to compare
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="w-40 h-40 -mr-2 shrink-0 rounded-pill flex items-center justify-center press-scale motion-reduce:transition-none hover:bg-surface-muted"
          >
            <img
              src="/assets/figma/icon-close-modal.svg"
              alt="Close product picker"
              width={24}
              height={24}
              className="w-24 h-24"
            />
          </button>
        </Cluster>

        <LayerGrid className="w-full flex-1 min-h-0 grid-rows-1 overflow-hidden">
          <motion.div
            ref={attachGridRef}
            onScroll={syncScrollMetrics}
            variants={pickerGridVariants}
            initial="hidden"
            animate="visible"
            className={clsx(
              "stack-cell w-full h-full min-h-0 grid grid-cols-3 auto-rows-max gap-8 px-10 pb-14 pt-4 overflow-y-auto sheet-scrollbar",
              scrollMaskClass,
            )}
          >
            {curatedItems.map(({ bag, badge }) => {
              const isPicked = badge === "Picked";
              return (
                <motion.button
                  key={bag.id}
                  type="button"
                  variants={pickerCardVariants}
                  disabled={isPicked}
                  onClick={() => {
                    if (!isPicked) {
                      onPickBag(bag);
                    }
                  }}
                  className={clsx(
                    "min-w-0 bg-surface rounded-card overflow-hidden flex flex-col text-left border",
                    isPicked
                      ? "border-border-strong ring-1 ring-border-strong cursor-default"
                      : "border-transparent press-scale motion-reduce:transition-none",
                  )}
                >
                  <Box className="w-full min-w-0 flex flex-col">
                    <LayerGrid className="w-full aspect-picker-card bg-surface-muted overflow-hidden shrink-0 image-outline">
                      <img
                        src={bag.image}
                        alt={bag.name}
                        className="stack-cell w-full h-full object-cover"
                      />
                      <Layer
                        className={clsx(
                          "self-start justify-self-start m-4 max-w-full px-6 py-2 rounded-pill font-roman text-micro tracking-xs truncate pointer-events-none",
                          badge === "Picked" && "bg-ink text-ink-inverse",
                          badge === "Viewed" &&
                            "bg-surface/95 backdrop-blur-subtle text-ink border border-border-chip shadow-bubble",
                          badge === "Recommended" &&
                            "bg-surface/90 backdrop-blur-subtle text-ink-charcoal border border-border-subtle",
                        )}
                      >
                        {badge}
                      </Layer>
                      {!isPicked && (
                        <img
                          src="/assets/figma/card-plus.svg"
                          alt=""
                          width={20}
                          height={20}
                          className="stack-cell self-end justify-self-end w-20 h-20 m-2"
                        />
                      )}
                    </LayerGrid>
                    <img
                      src="/assets/figma/card-slider-bar.svg"
                      alt=""
                      className="w-full h-2 object-cover shrink-0"
                    />
                    <Stack className="pt-6 pb-5 px-5 gap-2 text-left w-full min-w-0 shrink-0">
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
        </LayerGrid>
      </motion.div>
    </motion.div>
  );
}
