import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  DURATION_ENTER,
  EASE_PREMIUM,
  TRANSITION_ORB_EXIT,
  TRANSITION_ORB_GLIDE,
} from "../motion/presets";
import { Layer, LayerGrid } from "../primitives/Layout";

export type OrbStageState = "hero" | "thinking" | "receded";

export interface LiquidOrbProps {
  stageState: OrbStageState;
  bloomKey: number;
  staggerEntrance?: boolean;
}

/**
 * Single persistent Coach AI Liquid Orb.
 * - Safari/iOS WebKit-safe compositing: keeps `overflow-visible` on the outer `orb-feather` (`blur(5.5px)`)
 *   layer and isolates + radial-masks the inner `124x124` sphere (`orb-sphere-mask`) without SVG `feDisplacementMap`
 *   or `overflow: hidden` on filtered nodes (which cause rectangular compositor clipping on iOS Safari).
 * - 800ms luxury curve on enter and upward push, and explicit 0.56s opacity+blur+scale exit when receding.
 */
export function LiquidOrb({
  stageState,
  bloomKey,
  staggerEntrance = false,
}: LiquidOrbProps) {
  const prefersReducedMotion = useReducedMotion();

  const orbHostRef = useRef<HTMLDivElement | null>(null);
  const playbackRateRef = useRef<number>(1);

  useEffect(() => {
    const mediaQuery =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    if (prefersReducedMotion || mediaQuery?.matches) {
      return;
    }

    let rafId = 0;
    const targetPlaybackRate = stageState === "thinking" ? 2.1 : 1;

    const tick = () => {
      const next =
        playbackRateRef.current +
        (targetPlaybackRate - playbackRateRef.current) * 0.06;
      const settled = Math.abs(targetPlaybackRate - next) < 0.01;
      playbackRateRef.current = settled ? targetPlaybackRate : next;

      if (orbHostRef.current && typeof orbHostRef.current.getAnimations === "function") {
        const anims = orbHostRef.current.getAnimations({ subtree: true });
        for (const anim of anims) {
          if (anim instanceof CSSAnimation) {
            anim.playbackRate = playbackRateRef.current;
          }
        }
      }

      if (!settled) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion, stageState]);

  const isReceded = stageState === "receded";
  const isThinking = stageState === "thinking";

  const targetScale = isReceded ? 0.78 : isThinking ? 0.88 : 1;
  const targetY = isReceded ? -24 : isThinking ? -6 : 18;
  const targetOpacity = isReceded ? 0 : 1;
  const targetBlur = isReceded ? "blur(6px)" : "blur(0px)";

  return (
    <div
      ref={orbHostRef}
      data-bloom-key={bloomKey}
      aria-hidden="true"
      className="w-full py-6 flex items-center justify-center pointer-events-none overflow-visible"
    >
      <motion.div
        initial={
          prefersReducedMotion || !staggerEntrance
            ? {
                opacity: isReceded ? 0 : 0,
                scale: isReceded ? 0.78 : 0.76,
                y: isReceded ? -24 : 20,
                filter: "blur(6px)",
              }
            : {
                opacity: 0,
                scale: 0.74,
                y: 24,
                filter: "blur(6px)",
              }
        }
        animate={{
          opacity: targetOpacity,
          scale: targetScale,
          y: targetY,
          filter: targetBlur,
        }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : isReceded
            ? TRANSITION_ORB_EXIT
            : staggerEntrance
            ? { duration: DURATION_ENTER, delay: 0.15, ease: EASE_PREMIUM }
            : TRANSITION_ORB_GLIDE
        }
        className="overflow-visible will-change-transform"
      >
        <LayerGrid className="w-180 h-164 place-items-center overflow-visible">
          {/* Warm champagne-bronze ambient rim glow */}
          <Layer className="w-144 h-116 mt-12 rounded-pill bg-surface-orb-glow/55 blur-xl mix-blend-plus-lighter pointer-events-none" />

          {/* Outer overflow-visible 5.5px feather layer (Figma 2010:28663) so blur never hits a clip box in Safari */}
          <LayerGrid className="stack-cell w-180 h-164 place-items-center overflow-visible orb-feather">
            {/* Inner isolated + radial-masked pearl-espresso sphere */}
            <LayerGrid className="stack-cell w-124 h-124 place-items-center isolate orb-sphere-mask bg-surface-orb animate-orb-morph">
              {/* Rotating warm grain gradient */}
              <Layer className="pointer-events-none">
                <img
                  src="/assets/figma/orb-grain-gradient.png"
                  alt=""
                  className="w-152 h-152 max-w-none object-cover orb-sphere-mask mix-blend-soft-light opacity-95 pointer-events-none animate-orb-cw"
                />
              </Layer>

              {/* Figma's metallic champagne/pearl sphere render blended via screen */}
              <Layer className="pointer-events-none">
                <img
                  src="/assets/figma/orb-shimmer-overlay.png"
                  alt=""
                  className="w-160 h-148 max-w-none object-cover orb-sphere-mask mix-blend-screen opacity-95 pointer-events-none animate-orb-ccw"
                />
              </Layer>

              {/* Warm champagne & subtle pearlescent caustic lobes */}
              <LayerGrid className="stack-cell w-124 h-124 place-items-center mix-blend-plus-lighter pointer-events-none animate-orb-cw">
                <img
                  src="/assets/figma/orb-vec-16.svg"
                  alt=""
                  className="stack-cell w-88 h-52 -mt-26 mix-blend-plus-lighter opacity-95 pointer-events-none"
                />
                <img
                  src="/assets/figma/orb-vec-18.svg"
                  alt=""
                  className="stack-cell w-76 h-56 -ml-28 -mt-12 mix-blend-plus-lighter opacity-20 pointer-events-none"
                />
                <img
                  src="/assets/figma/orb-vec-19.svg"
                  alt=""
                  className="stack-cell w-76 h-56 ml-28 mt-24 mix-blend-plus-lighter opacity-20 pointer-events-none"
                />
              </LayerGrid>

              {/* Soft silver-pearl specular highlights */}
              <LayerGrid className="stack-cell w-124 h-124 place-items-center pointer-events-none">
                <img
                  src="/assets/figma/orb-ellipse-2132.svg"
                  alt=""
                  className="stack-cell w-44 h-24 ml-34 -mt-32 mix-blend-soft-light opacity-25 pointer-events-none"
                />
                <img
                  src="/assets/figma/orb-ellipse-2135.svg"
                  alt=""
                  className="stack-cell w-32 h-20 ml-40 -mt-28 mix-blend-plus-lighter opacity-35 pointer-events-none"
                />
                <img
                  src="/assets/figma/orb-ellipse-2134.svg"
                  alt=""
                  className="stack-cell w-34 h-30 -ml-26 mt-24 mix-blend-plus-lighter opacity-20 pointer-events-none"
                />
                <img
                  src="/assets/figma/orb-ellipse-2133.svg"
                  alt=""
                  className="stack-cell w-22 h-28 ml-30 mt-42 mix-blend-plus-lighter opacity-20 pointer-events-none"
                />
              </LayerGrid>
            </LayerGrid>
          </LayerGrid>
        </LayerGrid>
      </motion.div>
    </div>
  );
}
