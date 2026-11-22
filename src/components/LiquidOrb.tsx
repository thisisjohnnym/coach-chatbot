import { motion, useReducedMotion } from "motion/react";
import {
  EASE_PREMIUM,
  EASE_SHEET_OPEN_CHOREO,
  SHEET_OPEN_CHOREO,
  TRANSITION_ORB_EXIT,
  TRANSITION_ORB_GLIDE,
} from "../motion/presets";
import { GlassOrb, type OrbState } from "./liquidOrb/GlassOrb";

export type OrbStageState = "hero" | "thinking" | "receded";

export interface LiquidOrbProps {
  stageState: OrbStageState;
  bloomKey: number;
  staggerEntrance?: boolean;
  hiddenForTyping?: boolean;
}

function toGlassState(stage: OrbStageState): OrbState {
  return stage === "thinking" ? "thinking" : "idle";
}

/**
 * Persistent Coach AI liquid orb — Forge glass bead (raw WebGL).
 * Motion owns enter / glide / exit (including transition-only blur).
 */
export function LiquidOrb({
  stageState,
  bloomKey,
  staggerEntrance = false,
  hiddenForTyping = false,
}: LiquidOrbProps) {
  const prefersReducedMotion = useReducedMotion();
  const isReceded = stageState === "receded";
  const isThinking = stageState === "thinking";

  const targetScale = isReceded ? 0.78 : isThinking ? 0.88 : 1;
  const targetY = isReceded ? -24 : isThinking ? -6 : 18;
  const targetOpacity = isReceded ? 0 : 1;

  const paused =
    Boolean(prefersReducedMotion) ||
    isReceded ||
    hiddenForTyping;

  return (
    <div
      data-bloom-key={bloomKey}
      aria-hidden="true"
      className="w-full py-6 flex items-center justify-center pointer-events-none overflow-visible orb-compact-scale"
    >
      <motion.div
        initial={false}
        animate={
          prefersReducedMotion
            ? { opacity: hiddenForTyping ? 0 : 1 }
            : hiddenForTyping
              ? { opacity: 0, scale: 0.93, y: -10 }
              : { opacity: 1, scale: 1, y: 0 }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : hiddenForTyping
              ? { duration: 0.19, delay: 0.05, ease: EASE_PREMIUM }
              : { duration: 0.34, delay: 0.14, ease: EASE_PREMIUM }
        }
        className="overflow-visible will-change-transform"
      >
        <motion.div
          initial={
            prefersReducedMotion
              ? {
                  opacity: isReceded ? 0 : 1,
                  scale: targetScale,
                  y: targetY,
                }
              : staggerEntrance
                ? {
                    opacity: 0,
                    scale: 0.8,
                    y: targetY + 60,
                  }
                : {
                    opacity: 0,
                    scale: isReceded ? 0.78 : 0.76,
                    y: isReceded ? -24 : 20,
                    filter: "blur(6px)",
                  }
          }
          animate={
            isReceded
              ? {
                  opacity: targetOpacity,
                  scale: targetScale,
                  y: targetY,
                  filter: "blur(6px)",
                }
              : {
                  opacity: targetOpacity,
                  scale: targetScale,
                  y: targetY,
                  filter: "blur(0px)",
                  transitionEnd: { filter: "none" },
                }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : isReceded
                ? TRANSITION_ORB_EXIT
                : staggerEntrance
                  ? {
                      opacity: {
                        ...SHEET_OPEN_CHOREO.orb.opacity,
                        ease: EASE_SHEET_OPEN_CHOREO,
                      },
                      scale: {
                        ...SHEET_OPEN_CHOREO.orb.scale,
                        ease: EASE_SHEET_OPEN_CHOREO,
                      },
                      y: {
                        ...SHEET_OPEN_CHOREO.orb.y,
                        ease: EASE_SHEET_OPEN_CHOREO,
                      },
                      filter: { duration: 0 },
                    }
                  : TRANSITION_ORB_GLIDE
          }
          className="overflow-visible will-change-transform"
        >
          <div className="w-180 h-164 pointer-events-none">
            <GlassOrb
              key={bloomKey}
              state={toGlassState(stageState)}
              paused={paused}
              transparent
              radius={0.73}
              blur={0.25}
              wobble={0.8}
              grain={0}
              cast={0.1}
              reach={0.45}
              castFalloff={2.5}
              castDirectional={0.96}
              castX={-0.19}
              castY={-0.19}
              castTint={0.91}
              castColor="#ffcf9e"
              shape="spheres"
              morph={0.09}
              shapeSize={1.42}
              innerBlur={0.48}
              refraction={-0.06}
              refractionAnimate
              refractionMin={0}
              refractionMax={1}
              refractionPeriod={6}
              refractionWave="smooth"
              dispersion={1}
              perspective={0.14}
              halo={0}
              material="glass"
              particlesIn={96}
              particleSpread={1.2}
              particlesOut={91}
              orbitPattern="orbits"
              orbitDirection="mixed"
              orbitRadius={1}
              orbitSpread={0.14}
              orbitTilt={0.33}
              particleSize={0.4}
              particleSpeed={0.35}
              particleTwinkle={1}
              particleDepth={1}
              particleOpacity={0.48}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
