import { useEffect } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { BagProduct } from "../data/catalog";
import {
  TRANSITION_PICKER_CLOSE,
  TRANSITION_PICKER_OPEN,
  TRANSITION_PICKER_SCRIM_OPEN,
  contextualIconVariants,
} from "../motion/presets";
import { Box, Cluster, LayerGrid, Stack } from "../primitives/Layout";

export interface ProductDetailModalProps {
  bag: BagProduct;
  isInBag: boolean;
  onToggleBag: (bag: BagProduct) => void;
  onCompareBag: (bag: BagProduct) => void;
  onClose: () => void;
}

export function ProductDetailModal({
  bag,
  isInBag,
  onToggleBag,
  onCompareBag,
  onClose,
}: ProductDetailModalProps) {
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

  const specItems: Array<{ label: string; value: string }> = [
    { label: "Style", value: bag.specs.style },
    { label: "Size", value: bag.specs.size },
    { label: "Carry", value: bag.specs.carry },
    { label: "Color", value: bag.specs.color },
    { label: "Best for", value: bag.specs.bestFor },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: TRANSITION_PICKER_SCRIM_OPEN }}
      exit={{
        opacity: 0,
        pointerEvents: "none",
        transition: TRANSITION_PICKER_CLOSE,
      }}
      onClick={onClose}
      className="stack-cell pointer-events-auto w-full h-full min-h-0 bg-surface-modal-scrim backdrop-blur-subtle px-16 pt-safe-modal pb-safe-modal flex items-center justify-center overflow-hidden"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
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
        {/* Top bar — same type as product name in this overlay */}
        <Cluster className="pt-14 pb-10 px-14 gap-8 justify-between bg-surface shrink-0 min-w-0">
          <h3
            id="product-detail-title"
            className="text-subhead font-medium text-ink tracking-xs m-0 min-w-0 truncate"
          >
            Product details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-40 h-40 -mr-2 shrink-0 rounded-pill flex items-center justify-center press-scale motion-reduce:transition-none hover:bg-surface-muted"
          >
            <img
              src="/assets/figma/icon-close-modal.svg"
              alt="Close product details"
              width={24}
              height={24}
              className="w-24 h-24"
            />
          </button>
        </Cluster>

        {/* Scrollable product body */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto sheet-scrollbar flex flex-col">
          <Box className="w-full bg-surface-muted shrink-0">
            <img
              src={bag.image}
              alt={bag.name}
              className="w-full h-auto object-contain block"
            />
          </Box>

          <Stack className="p-16 gap-14 bg-surface">
            <Stack className="gap-6">
              <Box className="flex flex-row items-start justify-between gap-12">
                <h4 className="text-subhead font-medium text-ink tracking-xs text-balance m-0">
                  {bag.name}
                </h4>
                <span className="text-subhead font-medium text-ink tabular-nums shrink-0">
                  {bag.priceFormatted}
                </span>
              </Box>
              <p className="text-caption text-ink-charcoal tracking-xs text-pretty m-0">
                {bag.specs.summaryNote}
              </p>
            </Stack>

            <Stack className="border-t border-border-faint pt-10 gap-8">
              {specItems.map((item) => (
                <Box
                  key={item.label}
                  className="flex flex-row items-baseline justify-between gap-12 text-caption"
                >
                  <span className="text-ink-muted">{item.label}</span>
                  <span className="text-ink font-medium text-right">
                    {item.value}
                  </span>
                </Box>
              ))}
            </Stack>
          </Stack>
        </div>

        {/* Bottom CTA actions */}
        <Stack className="px-16 pt-10 pb-16 gap-8 border-t border-border-faint bg-surface shrink-0">
          <button
            type="button"
            aria-pressed={isInBag}
            onClick={() => onToggleBag(bag)}
            className={clsx(
              "w-full h-42 px-16 rounded-pill flex flex-row items-center justify-center gap-8 text-caption font-medium tracking-xs press-scale motion-reduce:transition-none",
              isInBag
                ? "bg-ink-charcoal text-ink-inverse"
                : "bg-ink text-ink-inverse",
            )}
          >
            <LayerGrid className="w-16 h-16 place-items-center shrink-0">
              <AnimatePresence mode="wait" initial={false}>
                {isInBag ? (
                  <motion.img
                    key="detail-added-check"
                    variants={contextualIconVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    src="/assets/figma/icon-check-white.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="stack-cell w-16 h-16"
                  />
                ) : (
                  <motion.img
                    key="detail-bag-icon"
                    variants={contextualIconVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    src="/assets/figma/icon-bag-white.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="stack-cell w-16 h-16"
                  />
                )}
              </AnimatePresence>
            </LayerGrid>
            <span>{isInBag ? "Added to bag" : `Add to bag · ${bag.priceFormatted}`}</span>
          </button>

          <button
            type="button"
            onClick={() => onCompareBag(bag)}
            className="w-full h-38 px-16 rounded-pill bg-surface text-ink border border-border-chip hover:bg-surface-muted flex flex-row items-center justify-center gap-6 text-caption tracking-xs press-scale motion-reduce:transition-none"
          >
            Compare with another bag
          </button>
        </Stack>
      </motion.div>
    </motion.div>
  );
}
