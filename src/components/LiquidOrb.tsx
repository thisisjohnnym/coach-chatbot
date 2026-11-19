import { useEffect, useId, useRef } from "react";
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

const BLOOM_DURATION_MS = 1160;
const BLOOM_PEAK_SCALE = 24;
const IDLE_TARGET_SCALE = 5.5;
const THINKING_TARGET_SCALE = 11.5;

/**
 * Single persistent Coach AI Liquid Orb.
 * - Zero clipping: wide -65%..230% SVG filter bounds + overflow-visible host + gentle upward lift (y: 18 -> -6 -> -24)
 *   so the feathered top halo never touches any clip boundary.
 * - 800ms luxury curve on enter and upward push, and explicit 0.56s opacity+blur+scale exit when receding.
 */
export function LiquidOrb({
  stageState,
  bloomKey,
  staggerEntrance = false,
}: LiquidOrbProps) {
  const rawId = useId();
  const filterId = `coach-liquid-orb-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const prefersReducedMotion = useReducedMotion();

  const orbHostRef = useRef<HTMLDivElement | null>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement | null>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const stageRef = useRef<OrbStageState>(stageState);
  const bloomOriginRef = useRef<number>(performance.now());
  const prevBloomKeyRef = useRef<number>(bloomKey);

  useEffect(() => {
    stageRef.current = stageState;
  }, [stageState]);

  useEffect(() => {
    if (prevBloomKeyRef.current !== bloomKey) {
      prevBloomKeyRef.current = bloomKey;
      bloomOriginRef.current = performance.now();
    }
  }, [bloomKey]);

  useEffect(() => {
    const mediaQuery =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    if (prefersReducedMotion || mediaQuery?.matches) {
      turbulenceRef.current?.setAttribute("baseFrequency", "0.02");
      displacementRef.current?.setAttribute("scale", "0");
      return;
    }

    let rafId = 0;
    const mountTime = performance.now();
    let currentScaleValue = BLOOM_PEAK_SCALE;
    let currentPlaybackRate = 1;

    const tick = (now: number) => {
      const sinceBloom = Math.max(0, now - bloomOriginRef.current);
      const bloomProgress = Math.min(sinceBloom / BLOOM_DURATION_MS, 1);
      const easedBloom = 1 - Math.pow(1 - bloomProgress, 3);

      const isThinking = stageRef.current === "thinking";
      const targetPlaybackRate = isThinking ? 2.1 : 1;
      currentPlaybackRate += (targetPlaybackRate - currentPlaybackRate) * 0.045;

      if (orbHostRef.current && typeof orbHostRef.current.getAnimations === "function") {
        const anims = orbHostRef.current.getAnimations({ subtree: true });
        for (const anim of anims) {
          if (anim instanceof CSSAnimation) {
            anim.playbackRate = currentPlaybackRate;
          }
        }
      }

      const elapsedSec = (now - mountTime) / 1000;
      const t = elapsedSec * (isThinking ? 1.4 : 1);
      const steadyBase = isThinking ? THINKING_TARGET_SCALE : IDLE_TARGET_SCALE;
      const breathingOffset = Math.sin(t * 1.6) * (isThinking ? 2.0 : 1.1);
      const desiredTarget =
        BLOOM_PEAK_SCALE + (steadyBase + breathingOffset - BLOOM_PEAK_SCALE) * easedBloom;

      currentScaleValue += (desiredTarget - currentScaleValue) * 0.09;

      const freqX = 0.021 + Math.sin(t * 0.72) * 0.004;
      const freqY = 0.021 + Math.cos(t * 0.58 + 0.9) * 0.004;

      turbulenceRef.current?.setAttribute(
        "baseFrequency",
        `${freqX.toFixed(4)} ${freqY.toFixed(4)}`
      );
      displacementRef.current?.setAttribute("scale", currentScaleValue.toFixed(2));

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [prefersReducedMotion]);

  const isReceded = stageState === "receded";
  const isThinking = stageState === "thinking";

  const targetScale = isReceded ? 0.78 : isThinking ? 0.88 : 1;
  const targetY = isReceded ? -24 : isThinking ? -6 : 18;
  const targetOpacity = isReceded ? 0 : 1;
  const targetBlur = isReceded ? "blur(6px)" : "blur(0px)";

  return (
    <div
      ref={orbHostRef}
      aria-hidden="true"
      className="w-full py-6 flex items-center justify-center pointer-events-none overflow-visible"
    >
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        className="w-0 h-0 overflow-hidden pointer-events-none shrink-0"
      >
        <defs>
          <filter id={filterId} x="-65%" y="-65%" width="230%" height="230%">
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.021 0.021"
              numOctaves={2}
              seed={7}
              result="warp"
            />
            <feDisplacementMap
              ref={displacementRef}
              in="SourceGraphic"
              in2="warp"
              scale={prefersReducedMotion ? 0 : BLOOM_PEAK_SCALE}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

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

          {/* Soft-focus feathered liquid pearl-espresso sphere matching Figma 2010:28663 */}
          <LayerGrid
            className="stack-cell w-124 h-124 place-items-center overflow-hidden bg-surface-orb animate-orb-morph"
            // design-system-escape: apply SVG liquid turbulence displacement + Figma 5.5px soft-focus feather
            style={{
              filter: prefersReducedMotion
                ? "blur(5.5px)"
                : `url(#${filterId}) blur(5.5px)`,
            }}
          >
            {/* Rotating warm grain gradient */}
            <Layer className="pointer-events-none">
              <img
                src="/assets/figma/orb-grain-gradient.png"
                alt=""
                className="w-152 h-152 max-w-none object-cover mix-blend-soft-light opacity-95 pointer-events-none animate-orb-cw"
              />
            </Layer>

            {/* Figma's metallic champagne/pearl sphere render blended via screen */}
            <Layer className="pointer-events-none">
              <img
                src="/assets/figma/orb-shimmer-overlay.png"
                alt=""
                className="w-160 h-148 max-w-none object-cover mix-blend-screen opacity-95 pointer-events-none animate-orb-ccw"
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
      </motion.div>
    </div>
  );
}
