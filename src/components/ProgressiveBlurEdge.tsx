import clsx from "clsx";
import { Layer, LayerGrid } from "../primitives/Layout";

export interface ProgressiveBlurEdgeProps {
  position: "top" | "bottom";
  visible: boolean;
  className?: string;
}

/**
 * Overlapping band-masked progressive blur per progressive-blur.mdc:
 * each layer owns a progressive slice (strongest right at the outer edge, zero inside)
 * so blur strength ramps 0px -> 0.5px -> 1px -> 2px -> 4px -> 7px without compounding
 * into a milky smear over white cards.
 */
const TOP_LAYERS = [
  {
    blur: "blur(0.5px)",
    mask: "linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 50%)",
  },
  {
    blur: "blur(1px)",
    mask: "linear-gradient(to top, rgba(0,0,0,0) 20%, rgba(0,0,0,1) 35%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 70%)",
  },
  {
    blur: "blur(2px)",
    mask: "linear-gradient(to top, rgba(0,0,0,0) 40%, rgba(0,0,0,1) 55%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 88%)",
  },
  {
    blur: "blur(4px)",
    mask: "linear-gradient(to top, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 75%, rgba(0,0,0,1) 92%, rgba(0,0,0,0) 100%)",
  },
  {
    blur: "blur(7px)",
    mask: "linear-gradient(to top, rgba(0,0,0,0) 78%, rgba(0,0,0,1) 92%, rgba(0,0,0,1) 100%)",
  },
] as const;

const BOTTOM_LAYERS = [
  {
    blur: "blur(0.5px)",
    mask: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 50%)",
  },
  {
    blur: "blur(1px)",
    mask: "linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(0,0,0,1) 35%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 70%)",
  },
  {
    blur: "blur(2px)",
    mask: "linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,1) 55%, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 88%)",
  },
  {
    blur: "blur(4px)",
    mask: "linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 75%, rgba(0,0,0,1) 92%, rgba(0,0,0,0) 100%)",
  },
  {
    blur: "blur(7px)",
    mask: "linear-gradient(to bottom, rgba(0,0,0,0) 78%, rgba(0,0,0,1) 92%, rgba(0,0,0,1) 100%)",
  },
] as const;

export function ProgressiveBlurEdge({
  position,
  visible,
  className,
}: ProgressiveBlurEdgeProps) {
  const layers = position === "top" ? TOP_LAYERS : BOTTOM_LAYERS;

  return (
    <LayerGrid
      aria-hidden="true"
      className={clsx(
        "stack-cell z-10 w-full h-36 pointer-events-none transition-opacity duration-500 motion-reduce:transition-none",
        position === "top" ? "self-start" : "self-end",
        visible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      {layers.map((layer, index) => (
        <Layer
          key={index}
          className="w-full h-full pointer-events-none"
          // design-system-escape: progressive blur requires per-layer overlapping backdropFilter and maskImage stops
          style={{
            backdropFilter: layer.blur,
            WebkitBackdropFilter: layer.blur,
            maskImage: layer.mask,
            WebkitMaskImage: layer.mask,
          }}
        />
      ))}
    </LayerGrid>
  );
}
