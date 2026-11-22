import clsx from "clsx";
import { Layer, LayerGrid } from "../primitives/Layout";

export interface ProgressiveBlurEdgeProps {
  position: "top" | "bottom";
  visible: boolean;
  className?: string;
}

/**
 * Seam-hide for the chat scroller only (sibling of the scrollport in ChatThreadView).
 * Softens content where it meets the header / input dock — not sheet chrome.
 *
 * Paired with `scroll-mask-*` on the scroller (opacity feather). This layer only
 * adds a short sheet-tinted fade. Chrome turns stacked `backdrop-filter` seams into
 * milky bars inside rounded `overflow:hidden` sheet ancestors, so blur stays off here.
 */
export function ProgressiveBlurEdge({
  position,
  visible,
  className,
}: ProgressiveBlurEdgeProps) {
  const alignClass = position === "top" ? "self-start" : "self-end";
  const fadeClass =
    position === "top" ? "scroll-edge-fade-top" : "scroll-edge-fade-bottom";

  return (
    <LayerGrid
      aria-hidden="true"
      className={clsx(
        "stack-cell z-10 w-full h-36 pointer-events-none transition-opacity duration-500 motion-reduce:transition-none",
        alignClass,
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <Layer className={clsx("w-full h-full pointer-events-none", fadeClass)} />
    </LayerGrid>
  );
}
