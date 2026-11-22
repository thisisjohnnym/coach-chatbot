import { useEffect, useRef, useState } from "react";

/**
 * GlassOrb — soft out-of-focus glass bead (single fragment shader).
 * Ported from Forge `electric-dune`; Motion in LiquidOrb owns enter/glide/exit.
 *
 * - One draw call, no textures, no Three.js.
 * - Every motion term (interior light, silhouette wobble, light cast, dust) is an integer
 *   harmonic of one phase, so the loop is seamless (`loop` seconds) and speed changes
 *   between states stay continuous.
 * - Fine dust lives inside the glass and orbits around it in a choice of patterns.
 * - Pauses when off-screen, tab hidden, reduced motion, or `paused`.
 */

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'
/** Form of the lights inside the glass. */
export type OrbShape = 'spheres' | 'tubes' | 'wobbly'
/** What the bead and its dust are made of. */
export type OrbMaterial = 'glass' | 'frosted' | 'chrome' | 'pearl' | 'iridescent' | 'obsidian'
export const MATERIALS: OrbMaterial[] = ['glass', 'frosted', 'chrome', 'pearl', 'iridescent', 'obsidian']
/** How the dust moves around the orb. */
export type OrbitPattern = 'rings' | 'orbits' | 'spiral' | 'swarm' | 'motes'
export type OrbitDirection = 'cw' | 'ccw' | 'mixed'

// [elongation 0–1 (sphere → short tube), lumpiness 0–0.4 (wobbly sphere)]
const SHAPES: Record<OrbShape, [number, number]> = {
  spheres: [0, 0],
  tubes: [0.85, 0],
  wobbly: [0, 0.3],
}

// material → [frost, metal, iridescence, gloss, dark, pearl]; eased on the way, so switching cross-fades
const MAT: Record<OrbMaterial, number[]> = {
  glass: [0, 0, 0, 0, 0, 0],
  frosted: [1, 0, 0.1, 0, 0, 0.1],
  chrome: [0, 1, 0, 0.8, 0, 0],
  pearl: [0.3, 0.1, 0.45, 0.35, 0, 1],
  iridescent: [0, 0.08, 1, 0.3, 0, 0],
  obsidian: [0, 0.2, 0, 1, 1, 0],
}

// ── dust ─────────────────────────────────────────────────────────────────────
// Positions are computed here (cheap) and handed to the shader as uniform arrays, so the
// per-pixel loop only does a distance test. Every path is an integer harmonic of the dust
// phase (or wraps while faded out), so the dust loops seamlessly with the orb.
const MAXP = 96
const TAU = Math.PI * 2

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEEDS = (() => {
  const r = mulberry(0x51ed27)
  // inside: a resting spot in the disc plus a small integer-harmonic wander
  const inside = Array.from({ length: MAXP }, () => {
    const a = r() * TAU
    const d = 0.78 * Math.sqrt(r())
    return {
      x0: d * Math.cos(a), y0: d * Math.sin(a), wamp: 0.05 + 0.14 * r(),
      n1: 1 + Math.floor(r() * 3), n2: 1 + Math.floor(r() * 3), ax: r() * TAU, bx: r() * TAU, z: r(),
    }
  })
  const outside = Array.from({ length: MAXP }, () => ({
    a0: r() * TAU, dir: r() < 0.5 ? -1 : 1, rho: r(), pl: Math.floor(r() * 3), u0: r(),
    n1: 1 + Math.floor(r() * 3), n2: 1 + Math.floor(r() * 3), n3: 1 + Math.floor(r() * 3),
    ax: r() * TAU, bx: r() * TAU, cx: r() * TAU, sx: r() * 2 - 1, sz: r() * 2 - 1, bob: r() * TAU, bn: 1 + Math.floor(r() * 3),
  }))
  return { inside, outside }
})()

export interface OrbColors {
  /** Smoky body of the bead. */
  core: string
  /** Indigo wash behind the upper-left. */
  tint: string
  /** Dark rim and smoky halo. */
  rim: string
  /** Large warm glow, lower-left. */
  warm: string
  /** Soft glow, lower-right. */
  lilac: string
  /** Cool specular highlight, upper-right. */
  highlight: string
}

/** Coach-warm palette (aligned with prior liquid orb / sheet). */
export const DEFAULT_COLORS: OrbColors = {
  core: "#4b3a2d",
  tint: "#7a5f8a",
  rim: "#17120f",
  warm: "#fff3db",
  lilac: "#c4a8d8",
  highlight: "#fff6ee",
}

export interface GlassOrbProps {
  /** Assistant activity. Changes energy + tempo, eased smoothly. */
  state?: OrbState
  /** Seconds for one seamless loop at idle tempo. */
  loop?: number
  /** Orb radius vs shorter canvas side (0.5 = orb fills half the box). */
  radius?: number
  /** Edge softness — the defocus of the bead. */
  blur?: number
  /** How much the silhouette undulates (0 = perfect circle). */
  wobble?: number
  /** Film grain strength. */
  grain?: number
  /** Strength of the light the orb casts onto the plane around it. */
  cast?: number
  /** How far the cast light travels (scale factor). */
  reach?: number
  /** Shape of the cast glow's falloff: <1 hugs the orb with a long tail, >1 is a soft shoulder that ends sooner. */
  castFalloff?: number
  /** 0 = the glow rings the orb evenly, 1 = each interior light throws its own colour in its own direction. */
  castDirectional?: number
  /** Shifts the glow's centre (orb radii; x right, y up). */
  castX?: number
  castY?: number
  /** How much of the glow is replaced by `castColor` (0 = the orb's own lights). */
  castTint?: number
  castColor?: string
  /** Form of the interior lights. */
  shape?: OrbShape
  /** 0 = shapes stay as chosen, 1 = every light continuously morphs sphere ⇄ tube ⇄ wobbly over the loop. */
  morph?: number
  /** Size of the interior lights. */
  shapeSize?: number
  /** Interior defocus: 1 = fully melted, 0 = defined shapes with soft edges. */
  innerBlur?: number
  /** Lens effect: bends the interior toward the rim (negative magnifies the rim instead). */
  refraction?: number
  /** Animate refraction, cycling between `refractionMin` and `refractionMax`. */
  refractionAnimate?: boolean
  refractionMin?: number
  refractionMax?: number
  /** Seconds for one full min → max → min cycle. */
  refractionPeriod?: number
  /** `smooth` eases at both ends, `linear` ramps at a constant rate. */
  refractionWave?: 'smooth' | 'linear'
  /** Chromatic dispersion: splits red / blue around the lights. */
  dispersion?: number
  /** Parallax + view-dependent gradient: interior lights sit at different depths and the body shades with the viewing angle. */
  perspective?: number
  /** Let the viewing angle follow the pointer. */
  follow?: boolean
  /** Live voice level 0–1 (mic or TTS amplitude). In `speaking`, 0 uses a synthetic pulse. */
  level?: number
  /** Output only orb + cast light + halo with alpha, no backdrop. */
  transparent?: boolean
  /** Backdrop colour when not transparent. */
  background?: string
  /** Strength of the dark smoky halo around the rim (0 = none). */
  halo?: number
  /** Material of the bead and its dust. */
  material?: OrbMaterial
  /** Step through every material automatically, starting from `material`. */
  cycleMaterials?: boolean
  /** Seconds each material is held while cycling. */
  cycleSeconds?: number
  /** Specks of dust inside the glass (0–96). They are blurred by `innerBlur`. */
  particlesIn?: number
  /** How far the inside dust wanders from its resting spot. */
  particleSpread?: number
  /** Specks orbiting outside the orb (0–96). */
  particlesOut?: number
  /** Path the outside dust follows. */
  orbitPattern?: OrbitPattern
  orbitDirection?: OrbitDirection
  /** Nearest distance of the outside dust, in orb radii. */
  orbitRadius?: number
  /** Thickness of the band the outside dust occupies, in orb radii. */
  orbitSpread?: number
  /** Tilt of the orbit planes: 0 = flat to the screen, 1 = nearly edge-on. */
  orbitTilt?: number
  /** Speck size (they are meant to be a pixel or two). */
  particleSize?: number
  /** Tempo of the dust vs the orb (0 freezes it). */
  particleSpeed?: number
  /** How much the specks twinkle and glint. */
  particleTwinkle?: number
  /** Depth of field: 0 = every speck sharp, 1 = near and far specks melt away. */
  particleDepth?: number
  particleOpacity?: number
  /** `orb` draws specks in the orb's own glow colours, `custom` uses `particleColor`. */
  particleColorMode?: 'orb' | 'custom'
  particleColor?: string
  colors?: Partial<OrbColors>
  paused?: boolean
  className?: string
}

const PRESETS: Record<OrbState, { energy: number; speed: number }> = {
  idle: { energy: 0.2, speed: 1 },
  listening: { energy: 0.5, speed: 1.25 },
  thinking: { energy: 0.95, speed: 2.4 },
  speaking: { energy: 0.7, speed: 1.7 },
}

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}`

const buildFrag = (np: number) => `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define NP ${np}
uniform vec2 uRes;
uniform float uPhase, uEnergy, uLevel, uRadius, uBlur, uGrain, uBg, uWobble, uCast, uReach, uHalo;
uniform vec3 uBgColor, uCore, uTint, uRim, uWarm, uLilac, uHi;
uniform float uElong, uLump, uMorph, uSize, uInner, uRefract, uDisp, uPersp;
uniform vec2 uView;
// glow cast onto the plane
uniform float uCastFall, uCastDir, uCastTint;
uniform vec2 uCastOff;
uniform vec3 uCastColor;
// dust: xy position, z fade, w depth (0 far … 1 near)
uniform vec4 uPIn[NP];    // inside the glass (the interior's own space)
uniform vec4 uPOut[NP];   // around the orb (orb radii)
uniform float uNIn, uNOut, uPDof, uPOpa, uPCustom, uPSize, uPTwink, uPPhase;
uniform vec3 uPColor;
// material: frost, metal, iridescence, gloss, dark, pearl
uniform float uMFrost, uMMetal, uMIrid, uMGloss, uMDark, uMPearl;

// per-frame state shared with the interior (assigned in main)
vec2 gcL, gcH, gcW, gcP, gcD;   // light centres
vec2 gmL, gmH, gmW, gmP, gmD;   // (elongation, lumpiness) per light
float gRho, gSf, gBody, gFres, gRimMix, gFade;

float blob(vec2 p, vec2 c, float s){ vec2 d = p - c; return exp(-dot(d, d) / (s * s)); }
vec3 scr(vec3 a, vec3 b){ return 1.0 - (1.0 - a) * (1.0 - b); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
// sine-free hash: no banding / diagonal patterns at any resolution
float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// One interior light. Distance to a segment (length = elongation) gives sphere → short tube;
// an angular cosine on that distance gives lumpy, wobbly edges; a flat core + gaussian skirt
// gives the defocus control. Integer harmonics only, so everything loops.
float sh(vec2 p, vec2 c, float s, vec2 m, float n, float psi){
  vec2 d = p - c;
  float ang = atan(c.y, c.x) + 1.5708 + 0.5 * sin(uPhase + psi); // tubes lie tangent to the rim
  vec2 dir = vec2(cos(ang), sin(ang));
  float se = s * (1.0 - 0.3 * m.x);
  float h = m.x * s;
  vec2 v = d - clamp(dot(d, dir), -h, h) * dir;
  float dist = length(v);
  dist /= 1.0 + m.y * cos(n * atan(v.y, v.x + 1e-5) - 2.0 * uPhase + psi);
  float f = max(dist - gRho * se, 0.0) / (se * gSf);
  return exp(-f * f);
}

// morph target for one light: sphere → tube → wobbly, out of phase, blended with the chosen shape
vec2 mp(float kk, float o){
  float a = smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(kk * uPhase + o));
  float b = smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(kk * uPhase + o + 2.1));
  return mix(vec2(uElong, uLump), vec2(0.9 * a, 0.38 * b), uMorph);
}

// thin-film colour: one full hue cycle per loop when t advances by 1 per loop
vec3 film(float t){ return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }

// One speck of dust as additive light. dv = offset from its centre, fade = 0..1 envelope, z = depth,
// id = index, ratio = extra blur (the interior's defocus; 1 outside).
// A soft gaussian core with a faint halo, a slow twinkle, and an occasional fine cross-shaped glint that
// only survives while the speck is sharp. Out-of-focus (far from z ~ 0.6) specks spread out and dim.
vec3 speckLight(vec2 dv, float fade, float z, float id, float ratio){
  float hs = fract(id * 0.6180339 + 0.2);
  float bt = ratio * (1.0 + uPDof * 1.5 * abs(z - 0.62)) * (1.0 + 1.2 * uMFrost);
  float sg = (0.0045 + 0.0075 * hs * hs) * uPSize * (0.7 + 0.6 * z) * bt;
  float d2 = dot(dv, dv);
  if (d2 > 144.0 * sg * sg) return vec3(0.0);

  float hk = fract(id * 0.7548777 + 0.5);
  float hc = fract(id * 0.5698403 + 0.1);
  float tw = 0.5 + 0.5 * sin(floor(2.0 + 3.0 * hk) * uPPhase + 6.28318 * hs);
  float bright = mix(1.0, 0.25 + 0.75 * tw * tw, uPTwink);
  float dim = fade * (0.55 + 0.45 * z);
  float core = exp(-d2 / (sg * sg));
  float halo = 0.12 * exp(-d2 / (9.0 * sg * sg));
  float L = 5.0 * sg;
  vec2 a2 = dv * dv;
  float arm = exp(-a2.x / (L * L) - a2.y / (0.5 * sg * sg)) + exp(-a2.y / (L * L) - a2.x / (0.5 * sg * sg));
  float glint = arm * pow(tw, 6.0) * step(0.55, fract(id * 0.4142136 + 0.3)) * 0.9 * uPTwink / (bt * bt);

  vec3 base = hc < 0.3 ? uWarm : (hc < 0.6 ? uLilac : uHi);
  base = mix(base, vec3(1.0), 0.4);
  base = mix(base, uPColor, uPCustom);
  base = mix(base, film(hc + uPPhase / 6.28318), uMIrid * 0.8);
  base = mix(base, vec3(0.97, 0.94, 0.96), uMPearl * 0.6);
  base = mix(base, vec3(1.0), uMMetal * 0.5);
  return base * ((core + halo * 0.7) * bright / pow(bt, 1.2) + glint) * dim * uPOpa;
}

// all the dust inside the glass at interior sample point w — blurred by the same interior defocus
vec3 specksIn(vec2 w){
  vec3 s = vec3(0.0);
  float ratio = 1.0 + 4.0 * uInner;
  for (int i = 0; i < NP; i++) {
    if (float(i) >= uNIn) break;
    vec4 p = uPIn[i];
    s += speckLight(w - p.xy, 1.0, p.w, float(i), ratio);
  }
  return min(s, vec3(1.0));
}

// everything inside the glass at sample point w (called once, or 3x with dispersion)
vec3 interior(vec2 w){
  float S = uSize;
  vec3 col = uCore * gBody;
  col = mix(col, uTint, sh(w, gcL, 0.62 * S, gmL, 3.0, 0.5) * 0.9);
  col = mix(col, uTint, gFres * 0.4);
  col = mix(col, uCore * 0.55, sh(w * vec2(0.8, 1.6), gcD * vec2(0.8, 1.6), 0.5 * S, gmD, 2.0, 1.0) * 0.7);
  col = mix(col, uRim, gRimMix);

  vec3 g = uWarm * sh(w, gcW, 0.5 * S, gmW, 3.0, 2.0) * (0.95 + 0.1 * uLevel);
  g = scr(g, uLilac * sh(w, gcP, 0.42 * S, gmP, 2.0, 3.0) * 0.75);
  g = scr(g, uHi * sh(w, gcH, 0.26 * S, gmH, 3.0, 4.0) * 0.95 * (1.0 + 0.25 * uLevel));
  g = scr(g, specksIn(w));
  return scr(col, g * gFade);
}

// tiny studio: sky, dark horizon band, warm floor, two soft boxes — turns with the loop
vec3 envMap(vec3 R){
  R.xz = rot(uPhase) * R.xz;
  float up = R.y;
  vec3 sky = mix(uTint * 0.8 + uLilac * 0.3, uHi, smoothstep(0.05, 0.95, up));
  vec3 gnd = mix(uCore, uWarm * 0.9, 1.0 - smoothstep(-0.95, -0.1, up));
  vec3 c = mix(gnd, sky, smoothstep(-0.15, 0.15, up));
  float hz = (up - 0.02) * 5.5;
  c *= 1.0 - 0.75 * exp(-hz * hz);
  c += uHi * smoothstep(0.93, 0.985, dot(R, normalize(vec3(-0.5, 0.7, 0.5)))) * 0.9;
  c += uWarm * smoothstep(0.9, 0.98, dot(R, normalize(vec3(0.6, -0.2, 0.7)))) * 0.6;
  return min(c, vec3(1.0));
}

// material layer on the bead itself; glass (all zeros) leaves it untouched
vec3 orbMaterial(vec3 col, vec2 q, float r, vec2 V){
  vec2 qc = q / max(r, 1.0);
  vec3 N = vec3(qc, sqrt(max(1.0 - dot(qc, qc), 0.0)));
  float fres = pow(max(1.0 - N.z, 0.0), 2.0);
  vec3 R = vec3(2.0 * N.z * N.x, 2.0 * N.z * N.y, 2.0 * N.z * N.z - 1.0);
  vec3 f = film(fres * 1.2 + 0.35 * N.x - 0.3 * N.y + uPhase / 6.28318);

  // frosted: light scatters through the body and the rim softens
  vec3 fr = col * 0.55 + uHi * 0.22 * (0.35 + 0.65 * N.z) + uWarm * 0.1 * (1.0 - N.z);
  col = mix(col, fr, uMFrost * 0.85);
  // iridescent: thin-film colour that slides with viewing angle
  col = mix(col, scr(col * 0.6, f * (0.35 + 0.5 * fres)), uMIrid * 0.8);
  // pearl: milky body with a faint rainbow sheen toward the edge
  vec3 pearl = vec3(0.93, 0.9, 0.92) * (0.62 + 0.38 * N.z) + f * 0.25 * (0.3 + fres);
  col = mix(col, scr(pearl, col * 0.3), uMPearl * 0.8);
  // chrome: mirror of the little studio
  col = mix(col, envMap(R) * 0.9 + col * 0.12, uMMetal * 0.92);
  // obsidian: near-black body
  col = mix(col, col * 0.18 + uRim * 0.5, uMDark * 0.85);
  // gloss: window reflection + a pin catch-light
  vec3 Ld = normalize(vec3(-0.45, 0.62, 0.64) - vec3(0.35 * V, 0.0));
  float key = pow(max(dot(R, Ld), 0.0), mix(46.0, 10.0, uMFrost)) * uMGloss;
  float pin = pow(max(dot(R, normalize(vec3(0.5, -0.45, 0.7))), 0.0), 90.0) * 0.5 * uMGloss;
  return scr(col, uHi * key * 0.9 + uWarm * pin);
}

vec4 over(vec4 b, vec4 acc){ return vec4(b.rgb + acc.rgb * (1.0 - b.a), b.a + acc.a * (1.0 - b.a)); }

void main(){
  float ph = uPhase;
  float E = uEnergy;
  vec2 uv = (2.0 * gl_FragCoord.xy - uRes) / min(uRes.x, uRes.y);

  // sphere space
  float breathe = 1.0 + 0.016 * sin(ph) + 0.045 * uLevel;
  vec2 q = uv / (uRadius * breathe);
  float r = length(q);
  vec2 nq = q / max(r, 1e-4);
  float k = 0.5 + 0.5 * dot(nq, vec2(-0.5547, 0.8321)); // 1 = upper-left, 0 = lower-right

  // silhouette wobble: two rotating lobes (2nd + 3rd harmonic), integer in phase => loops
  float cp = cos(ph), sp = sin(ph), a3 = 2.0 * ph + 1.0;
  float c2 = nq.x * nq.x - nq.y * nq.y, s2 = 2.0 * nq.x * nq.y;
  float c3 = nq.x * (4.0 * nq.x * nq.x - 3.0), s3 = nq.y * (3.0 - 4.0 * nq.y * nq.y);
  float wob = uWobble * (0.03 + 0.035 * E + 0.03 * uLevel)
            * (0.8 * (c2 * cp + s2 * sp) + 0.6 * (c3 * cos(a3) - s3 * sin(a3)));
  float rw = r / (1.0 + wob);

  // view vector: the orb slowly turns toward you (loops), optionally follows the pointer
  vec2 V = 0.4 * vec2(sin(ph + 0.7), sin(2.0 * ph)) + 0.9 * uView;
  vec2 pv = uPersp * V;

  // liquid interior: lens bend + slow tilt + gentle domain warp
  vec2 q2 = q * (1.0 + 0.6 * uRefract * dot(q, q));
  vec2 w = rot(0.32 * sin(ph) * (0.5 + E)) * q2;
  w += (0.03 + 0.05 * E) * vec2(sin(2.6 * w.y + 2.0 * ph + 1.3), cos(2.2 * w.x + ph));
  float oa = 0.05 + 0.13 * E;

  // light centres, each at its own depth so parallax separates them
  vec2 cL = vec2(-0.42,  0.58) + oa * vec2(cos(ph + 0.5), sin(ph + 0.5));
  vec2 cH = vec2( 0.46,  0.46) + oa * 0.8 * vec2(cos(2.0 * ph + 2.0), sin(2.0 * ph + 2.0));
  vec2 cW = vec2(-0.30, -0.44) + oa * vec2(cos(ph + 3.0), sin(2.0 * ph + 3.0));
  vec2 cP = vec2( 0.38, -0.58) + oa * vec2(cos(3.0 * ph), sin(ph + 1.0));
  vec2 cD = vec2(-0.05,  0.18) + oa * 0.6 * vec2(sin(ph), cos(2.0 * ph));
  gcL = cL + pv * 0.3;  gcD = cD + pv * 0.1;  gcW = cW + pv * 0.6;
  gcP = cP + pv * 0.8;  gcH = cH + pv * 1.0;

  gmL = mp(1.0, 0.0);  gmH = mp(2.0, 1.7);  gmW = mp(1.0, 3.1);
  gmP = mp(3.0, 4.3);  gmD = mp(2.0, 5.2);
  gRho = (1.0 - uInner) * 0.9;
  gSf = 0.35 + 0.65 * uInner;

  // view-dependent body gradient + a tinted catch-light on the rim facing the view
  gBody = clamp(1.0 + 0.8 * uPersp * dot(q, V), 0.5, 1.6);
  gFres = pow(clamp(r, 0.0, 1.0), 3.0) * uPersp * (0.5 + 0.5 * dot(nq, normalize(V + vec2(1e-3, 0.0))));

  // dark rim (heavier upper-left) and its fade on the lights
  float rim = smoothstep(0.5, 1.02, min(rw, 1.3));
  gRimMix = rim * mix(0.45, 0.95, k);
  gFade = 1.0 - 0.5 * smoothstep(0.78, 1.0, rw);

  vec3 col;
  if (uDisp > 0.001) {
    float ds = 0.12 * uDisp * (0.3 + min(r, 1.2));
    col = vec3(interior(w * (1.0 - ds)).r, interior(w).g, interior(w * (1.0 + ds)).b);
  } else {
    col = interior(w);
  }
  col = orbMaterial(col, q, r, V);

  // dust drifting around the orb: far specks sit behind it, near ones in front
  vec2 nd = abs(2.0 * gl_FragCoord.xy / uRes - 1.0);
  float pfade = 1.0 - smoothstep(0.8, 1.0, max(nd.x, nd.y)); // nothing is cut off at the canvas edge
  vec4 pback = vec4(0.0), pfront = vec4(0.0);
  for (int i = 0; i < NP; i++) {
    if (float(i) >= uNOut) break;
    vec4 p = uPOut[i];
    vec3 s = speckLight(q - p.xy, p.z, p.w, 100.0 + float(i), 1.0) * pfade;
    float m = max(max(s.r, s.g), s.b);
    if (m > 0.002) {
      vec4 b = vec4(s / max(m, 1.0), min(m, 1.0));
      if (p.w < 0.5) pback = over(b, pback); else pfront = over(b, pfront);
    }
  }

  // defocused edge + smoky halo
  float a = 1.0 - smoothstep(1.0 - uBlur, 1.0 + uBlur, rw);
  float edge = max(abs(uv.x), abs(uv.y));
  float boxFade = 1.0 - smoothstep(0.55, 1.0, edge); // nothing is ever cut off at the box edge
  float ha = exp(-max(rw - 1.0, 0.0) * 4.5) * 0.42 * mix(0.35, 1.0, k) * uHalo * boxFade;

  // light cast onto the plane: each light throws its colour out in its own direction,
  // tracking the animated centres above, so the glow drifts with the interior
  float ex = 0.001 + 4.0 * uCastDir;
  float wW = pow(max(0.5 + 0.5 * dot(nq, normalize(gcW)), 1e-3), ex);
  float wP = pow(max(0.5 + 0.5 * dot(nq, normalize(gcP)), 1e-3), ex);
  float wH = pow(max(0.5 + 0.5 * dot(nq, normalize(gcH)), 1e-3), ex);
  float wL = pow(max(0.5 + 0.5 * dot(nq, normalize(gcL)), 1e-3), ex) * 0.5;
  float tot = wW + wP + wH + wL;
  vec3 sc = (uWarm * wW + uLilac * wP + uHi * wH + uTint * wL) / max(tot, 1e-3);
  sc = mix(sc, uCastColor, uCastTint);
  float rc = length(q - uCastOff) / (1.0 + wob);
  float fx = max(rc - 1.0, 0.0) * 2.2 / max(uReach, 0.05);
  float sa = exp(-pow(max(fx, 1e-4), uCastFall)) * uCast * min(tot, 1.0) * 0.75
           * (0.85 + 0.3 * E + 0.3 * uLevel) * boxFade;

  // backdrop: warm taupe, vignette, soft lift lower-left
  vec3 bg = uBgColor * (1.0 - 0.16 * smoothstep(0.5, 1.7, length(uv)));
  bg += vec3(0.07, 0.055, 0.04) * blob(uv, vec2(-0.35, -0.55), 0.9);

  // composite, premultiplied: backdrop -> cast light -> halo -> far dust -> orb -> near dust
  vec3 P = bg * uBg;
  float A = uBg;
  P = sc * sa + P * (1.0 - sa);
  A = sa + A * (1.0 - sa);
  P = uRim * ha + P * (1.0 - ha);
  A = ha + A * (1.0 - ha);
  P = pback.rgb + P * (1.0 - pback.a);
  A = pback.a + A * (1.0 - pback.a);
  P = col * a + P * (1.0 - a);
  A = a + A * (1.0 - a);
  P = pfront.rgb + P * (1.0 - pfront.a);
  A = pfront.a + A * (1.0 - pfront.a);

  // triangular-distribution grain, one value per device pixel
  vec2 gp = floor(gl_FragCoord.xy);
  P += (hash(gp) + hash(gp + 19.19) - 1.0) * uGrain * A;
  gl_FragColor = vec4(clamp(P, 0.0, A), A);
}
`

function hexToRgb(hex: string, fallback: [number, number, number] = [0.66, 0.6, 0.545]): [number, number, number] {
  let h = (hex || '').replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return fallback
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s))
    return null
  }
  return s
}

export function GlassOrb(props: GlassOrbProps) {
  const {
    state = "idle",
    loop = 9,
    radius = 0.62,
    blur = 0.1,
    wobble = 1,
    grain = 0.07,
    cast = 0.6,
    reach = 1,
    castFalloff = 1,
    castDirectional = 1,
    castX = 0,
    castY = 0,
    castTint = 0,
    castColor = "#ffcf9e",
    shape = "spheres",
    morph = 0,
    shapeSize = 1,
    innerBlur = 1,
    refraction = 0,
    refractionAnimate = false,
    refractionMin = 0,
    refractionMax = 1,
    refractionPeriod = 6,
    refractionWave = "smooth",
    dispersion = 0,
    perspective = 0.3,
    follow = false,
    level = 0,
    transparent = true,
    background = "#a89a8b",
    halo = 1,
    material = "glass",
    cycleMaterials = false,
    cycleSeconds = 5,
    particlesIn = 36,
    particleSpread = 1,
    particlesOut = 56,
    orbitPattern = "rings",
    orbitDirection = "mixed",
    orbitRadius = 1.25,
    orbitSpread = 0.7,
    orbitTilt = 0.35,
    particleSize = 1,
    particleSpeed = 1,
    particleTwinkle = 0.6,
    particleDepth = 0.55,
    particleOpacity = 1,
    particleColorMode = "orb",
    particleColor = "#ffffff",
    colors,
    paused = false,
    className,
  } = props

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef<
    Required<Omit<GlassOrbProps, "className" | "colors">> & { colors: OrbColors }
  >(null as never)
  const merged: OrbColors = { ...DEFAULT_COLORS, ...colors }
  propsRef.current = {
    state, loop, radius, blur, wobble, grain, cast, reach, castFalloff, castDirectional, castX, castY, castTint, castColor,
    shape, morph, shapeSize, innerBlur, refraction, refractionAnimate, refractionMin, refractionMax, refractionPeriod,
    refractionWave, dispersion, perspective, follow, level, transparent, background, halo, paused, colors: merged,
    material, cycleMaterials, cycleSeconds, particlesIn, particleSpread, particlesOut, orbitPattern, orbitDirection,
    orbitRadius, orbitSpread, orbitTilt, particleSize, particleSpeed, particleTwinkle, particleDepth, particleOpacity,
    particleColorMode, particleColor,
  }
  const kickRef = useRef<() => void>(() => {})
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    })
    if (!gl) {
      setFailed(true)
      return
    }
    // dust positions travel as uniforms: use as many as the GPU allows (up to MAXP per layer)
    const maxVec = (gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number) || 64
    const np = Math.max(8, Math.min(MAXP, Math.floor((maxVec - 56) / 2)))
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, buildFrag(np))
    if (!vs || !fs) {
      setFailed(true)
      return
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog))
      setFailed(true)
      return
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const U = (n: string) => gl.getUniformLocation(prog, n)
    const u = {
      res: U('uRes'), phase: U('uPhase'), energy: U('uEnergy'), level: U('uLevel'),
      radius: U('uRadius'), blur: U('uBlur'), grain: U('uGrain'), bg: U('uBg'), bgColor: U('uBgColor'),
      wobble: U('uWobble'), halo: U('uHalo'), cast: U('uCast'), reach: U('uReach'),
      castFall: U('uCastFall'), castDir: U('uCastDir'), castTint: U('uCastTint'), castOff: U('uCastOff'), castColor: U('uCastColor'),
      elong: U('uElong'), lump: U('uLump'), morph: U('uMorph'), size: U('uSize'), inner: U('uInner'),
      refract: U('uRefract'), disp: U('uDisp'), persp: U('uPersp'), view: U('uView'),
      core: U('uCore'), tint: U('uTint'), rim: U('uRim'), warm: U('uWarm'), lilac: U('uLilac'), hi: U('uHi'),
      pIn: U('uPIn'), pOut: U('uPOut'), nIn: U('uNIn'), nOut: U('uNOut'), pDof: U('uPDof'), pOpa: U('uPOpa'),
      pCustom: U('uPCustom'), pColor: U('uPColor'), pSize: U('uPSize'), pTwink: U('uPTwink'), pPhase: U('uPPhase'),
      mFrost: U('uMFrost'), mMetal: U('uMMetal'), mIrid: U('uMIrid'), mGloss: U('uMGloss'),
      mDark: U('uMDark'), mPearl: U('uMPearl'),
    }
    const pIn = new Float32Array(np * 4)
    const pOut = new Float32Array(np * 4)

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let phase = 0
    let energy = PRESETS[propsRef.current.state].energy
    let speed = PRESETS[propsRef.current.state].speed
    let lvl = 0
    let vx = 0, vy = 0 // eased pointer view
    let tx = 0, ty = 0 // pointer target
    let last = performance.now()
    let raf = 0
    let inView = true
    let pphase = 0 // dust phase — its own clock so dust tempo can change without touching the orb
    let rphase = 0 // refraction cycle phase
    let clock = 0 // seconds spent running, drives material cycling

    // material the bead is heading for (the one chosen, or the next in the cycle)
    const targetMat = () => {
      const p = propsRef.current
      const i0 = Math.max(0, MATERIALS.indexOf(p.material))
      const i = p.cycleMaterials ? (i0 + Math.floor(clock / Math.max(1, p.cycleSeconds))) % MATERIALS.length : i0
      return MAT[MATERIALS[i]]
    }
    const mat = targetMat().slice()

    // refraction now: the slider, or a sweep between min and max
    const refractionNow = () => {
      const p = propsRef.current
      if (!p.refractionAnimate) return p.refraction
      const t = p.refractionWave === 'linear' ? Math.abs(rphase / Math.PI - 1) : 0.5 - 0.5 * Math.cos(rphase)
      return p.refractionMin + (p.refractionMax - p.refractionMin) * t
    }

    const frac = (x: number) => x - Math.floor(x)

    // dust positions for this frame
    const fillParticles = () => {
      const p = propsRef.current
      const aspect = canvas.width / Math.max(1, canvas.height)
      const Vx = 0.4 * Math.sin(phase + 0.7) + 0.9 * vx
      const Vy = 0.4 * Math.sin(2 * phase) + 0.9 * vy
      const pvx = p.perspective * Vx, pvy = p.perspective * Vy

      // inside the glass: each speck rests at a spot in the disc and wanders on an integer-harmonic loop
      for (let i = 0; i < np; i++) {
        const s = SEEDS.inside[i]
        let x = s.x0 + s.wamp * p.particleSpread * Math.sin(s.n1 * pphase + s.ax)
        let y = s.y0 + s.wamp * p.particleSpread * Math.sin(s.n2 * pphase + s.bx)
        const l = Math.hypot(x, y)
        if (l > 0.85) { x *= 0.85 / l; y *= 0.85 / l }
        pIn[i * 4] = x + pvx * (s.z - 0.5) * 0.9
        pIn[i * 4 + 1] = y + pvy * (s.z - 0.5) * 0.9
        pIn[i * 4 + 2] = 1
        pIn[i * 4 + 3] = s.z
      }

      // around the orb
      const pat = p.orbitPattern
      const lo = p.orbitRadius
      const band = p.orbitSpread
      const reachR = lo + band + 0.6
      const ex = Math.min(1 + 0.5 * (Math.max(aspect, 1) - 1), 1.6)
      const ey = Math.min(1 + 0.5 * (Math.max(1 / aspect, 1) - 1), 1.6)
      const planeTilt = pat === 'orbits' ? 0.35 + p.orbitTilt : pat === 'spiral' ? p.orbitTilt * 0.7 : p.orbitTilt * 1.25
      const ct = Math.cos(planeTilt), st = Math.sin(planeTilt)
      for (let i = 0; i < np; i++) {
        const s = SEEDS.outside[i]
        const sgn = p.orbitDirection === 'cw' ? -1 : p.orbitDirection === 'ccw' ? 1 : s.dir
        const R = lo + band * Math.pow(s.rho, 0.8)
        let x = 0, y = 0, zc = 0, fade = 1

        if (pat === 'rings' || pat === 'orbits' || pat === 'spiral') {
          let Rr = R
          let ang = 0
          let roll = 0
          if (pat === 'rings') {
            ang = s.a0 + sgn * (s.rho < 0.4 ? 2 : 1) * pphase // inner rings turn faster
          } else if (pat === 'orbits') {
            ang = s.a0 + sgn * pphase
            roll = (s.pl * Math.PI) / 3 // three crossing orbit planes
          } else {
            const u = frac(s.u0 + pphase / TAU) // flows outward, fading in and out so the wrap is invisible
            Rr = lo * 0.85 + (band + 0.6) * u
            ang = s.a0 + sgn * pphase + 2.4 * u
            fade = Math.pow(Math.sin(Math.PI * u), 1.5)
          }
          const x0 = Rr * Math.cos(ang)
          const y0 = Rr * Math.sin(ang) * ct
          const z0 = Rr * Math.sin(ang) * st
          const cr = Math.cos(roll), sr = Math.sin(roll)
          x = x0 * cr - y0 * sr
          y = x0 * sr + y0 * cr
          zc = z0 / reachR
        } else if (pat === 'swarm') {
          // weaving Lissajous figures, each at its own orientation, passing in front of and behind the orb
          const lx = R * Math.sin(s.n1 * pphase + s.ax)
          const ly = R * 0.85 * Math.sin(s.n2 * pphase + s.bx)
          const cr = Math.cos(s.a0), sr = Math.sin(s.a0)
          x = (lx * cr - ly * sr) * ex
          y = (lx * sr + ly * cr) * ey
          zc = Math.sin(s.n3 * pphase + s.cx)
        } else {
          // motes: slow rising (or falling) dust that fades in and out
          const u = frac(s.u0 - sgn * (pphase / TAU))
          x = s.sx * (lo + band) * ex + 0.12 * Math.sin(s.bn * pphase + s.bob)
          y = (u * 2 - 1) * (lo + 0.5 * band + 0.4) * ey
          fade = Math.pow(Math.sin(Math.PI * u), 0.7)
          zc = s.sz
        }
        pOut[i * 4] = x + Vx * zc * 0.18
        pOut[i * 4 + 1] = y + Vy * zc * 0.18
        pOut[i * 4 + 2] = fade
        pOut[i * 4 + 3] = Math.max(0, Math.min(1, 0.5 + 0.5 * zc))
      }
    }

    const resize = () => {
      // 1 backing pixel per device pixel (capped at 2) so grain is never resampled
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
    }

    const setColor = (loc: WebGLUniformLocation | null, hex: string) => {
      const [r, g, b] = hexToRgb(hex)
      gl.uniform3f(loc, r, g, b)
    }

    const draw = () => {
      const p = propsRef.current
      gl.uniform2f(u.res, canvas.width, canvas.height)
      gl.uniform1f(u.phase, phase)
      gl.uniform1f(u.energy, energy)
      gl.uniform1f(u.level, lvl)
      gl.uniform1f(u.radius, p.radius)
      gl.uniform1f(u.blur, Math.max(0.005, p.blur))
      gl.uniform1f(u.grain, p.grain)
      gl.uniform1f(u.bg, p.transparent ? 0 : 1)
      gl.uniform1f(u.wobble, p.wobble)
      gl.uniform1f(u.cast, p.cast)
      gl.uniform1f(u.reach, p.reach)
      gl.uniform1f(u.castFall, Math.max(0.2, p.castFalloff))
      gl.uniform1f(u.castDir, p.castDirectional)
      gl.uniform1f(u.castTint, p.castTint)
      gl.uniform2f(u.castOff, p.castX, p.castY)
      setColor(u.castColor, p.castColor)
      gl.uniform1f(u.halo, p.halo)
      const [el, lump] = SHAPES[p.shape] ?? SHAPES.spheres
      gl.uniform1f(u.elong, el)
      gl.uniform1f(u.lump, lump)
      gl.uniform1f(u.morph, p.morph)
      gl.uniform1f(u.size, p.shapeSize)
      gl.uniform1f(u.inner, p.innerBlur)
      gl.uniform1f(u.refract, refractionNow())
      gl.uniform1f(u.disp, p.dispersion)
      gl.uniform1f(u.persp, p.perspective)
      gl.uniform2f(u.view, vx, vy)
      setColor(u.bgColor, p.background)
      setColor(u.core, p.colors.core)
      setColor(u.tint, p.colors.tint)
      setColor(u.rim, p.colors.rim)
      setColor(u.warm, p.colors.warm)
      setColor(u.lilac, p.colors.lilac)
      setColor(u.hi, p.colors.highlight)

      fillParticles()
      gl.uniform4fv(u.pIn, pIn)
      gl.uniform4fv(u.pOut, pOut)
      gl.uniform1f(u.nIn, Math.max(0, Math.min(np, Math.round(p.particlesIn))))
      gl.uniform1f(u.nOut, Math.max(0, Math.min(np, Math.round(p.particlesOut))))
      gl.uniform1f(u.pDof, p.particleDepth)
      gl.uniform1f(u.pOpa, p.particleOpacity)
      gl.uniform1f(u.pCustom, p.particleColorMode === 'custom' ? 1 : 0)
      gl.uniform1f(u.pSize, p.particleSize)
      gl.uniform1f(u.pTwink, p.particleTwinkle)
      gl.uniform1f(u.pPhase, pphase)
      setColor(u.pColor, p.particleColor)
      gl.uniform1f(u.mFrost, mat[0])
      gl.uniform1f(u.mMetal, mat[1])
      gl.uniform1f(u.mIrid, mat[2])
      gl.uniform1f(u.mGloss, mat[3])
      gl.uniform1f(u.mDark, mat[4])
      gl.uniform1f(u.mPearl, mat[5])
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const running = () => inView && !document.hidden && !propsRef.current.paused && !mq.matches

    const frame = (now: number) => {
      raf = 0
      if (!running()) return
      const p = propsRef.current
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now

      const t = PRESETS[p.state]
      const e = 1 - Math.exp(-dt * 3)
      energy += (t.energy - energy) * e
      speed += (t.speed - speed) * e
      phase = (phase + (dt * TAU * speed) / Math.max(1, p.loop)) % TAU
      pphase = (pphase + (dt * TAU * speed * p.particleSpeed) / Math.max(1, p.loop)) % TAU
      if (p.refractionAnimate) rphase = (rphase + (dt * TAU) / Math.max(0.5, p.refractionPeriod)) % TAU

      // material: ease toward the target so switching (or cycling) cross-fades
      if (p.cycleMaterials) clock += dt
      const tm = targetMat()
      const em = 1 - Math.exp(-dt * 4)
      for (let m = 0; m < mat.length; m++) mat[m] += (tm[m] - mat[m]) * em

      let target = p.level
      if (p.state === 'speaking' && target <= 0) {
        target = 0.8 * (0.5 + 0.5 * Math.sin(phase * 3) * Math.sin(phase * 5 + 1))
      }
      lvl += (target - lvl) * (1 - Math.exp(-dt * 12))

      const pk = 1 - Math.exp(-dt * 4)
      vx += ((p.follow ? tx : 0) - vx) * pk
      vy += ((p.follow ? ty : 0) - vy) * pk

      draw()
      raf = requestAnimationFrame(frame)
    }

    const kick = () => {
      if (running()) {
        if (!raf) {
          last = performance.now()
          raf = requestAnimationFrame(frame)
        }
      } else {
        // not animating: land on the chosen material at once and repaint a still frame
        const tm = targetMat()
        for (let m = 0; m < mat.length; m++) mat[m] = tm[m]
        resize()
        draw()
      }
    }
    kickRef.current = kick

    const ro = new ResizeObserver(() => {
      resize()
      draw()
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([en]) => {
      inView = en.isIntersecting
      kick()
    })
    io.observe(canvas)
    const onVis = () => kick()
    document.addEventListener('visibilitychange', onVis)
    mq.addEventListener('change', onVis)
    const onPointer = (ev: PointerEvent) => {
      const b = canvas.getBoundingClientRect()
      const m = Math.max(b.width, b.height) / 2 || 1
      tx = Math.max(-1, Math.min(1, (ev.clientX - (b.left + b.width / 2)) / m))
      ty = Math.max(-1, Math.min(1, -(ev.clientY - (b.top + b.height / 2)) / m))
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    const onLost = (ev: Event) => {
      ev.preventDefault()
      cancelAnimationFrame(raf)
      raf = 0
    }
    canvas.addEventListener('webglcontextlost', onLost)

    resize()
    draw()
    kick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      mq.removeEventListener('change', onVis)
      canvas.removeEventListener('webglcontextlost', onLost)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  // props changed → wake the loop, or repaint once if paused / reduced motion
  const colorKey = Object.values(merged).join()
  useEffect(() => {
    kickRef.current()
  }, [state, loop, radius, blur, wobble, grain, cast, reach, castFalloff, castDirectional, castX, castY, castTint, castColor,
    shape, morph, shapeSize, innerBlur, refraction, refractionAnimate, refractionMin, refractionMax, refractionPeriod, refractionWave,
    dispersion, perspective, follow, level, transparent, background, halo, paused, colorKey,
    material, cycleMaterials, cycleSeconds, particlesIn, particleSpread, particlesOut, orbitPattern, orbitDirection,
    orbitRadius, orbitSpread, orbitTilt, particleSize, particleSpeed, particleTwinkle, particleDepth, particleOpacity,
    particleColorMode, particleColor])

  const fallbackBg = failed
    ? `radial-gradient(circle at 38% 72%, ${merged.warm} 0, transparent 18%), radial-gradient(circle at 62% 30%, ${merged.highlight} 0, transparent 12%), radial-gradient(circle at 40% 28%, ${merged.tint} 0, transparent 22%), radial-gradient(circle at 50% 50%, ${merged.core} 0, ${merged.rim} 24%, transparent 31%), ${transparent ? "transparent" : background}`
    : undefined

  return (
    <div
      // layout-relative-needed: WebGL canvas must fill host; absolute inset overlay
      className={`relative size-full overflow-hidden ${className ?? ""}`.trim()}
      // design-system-escape: CSS radial fallback only when WebGL init fails
      style={fallbackBg ? { background: fallbackBg } : undefined}
    >
      {!failed && (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Assistant orb"
          className="absolute inset-0 block size-full"
        />
      )}
    </div>
  )
}
