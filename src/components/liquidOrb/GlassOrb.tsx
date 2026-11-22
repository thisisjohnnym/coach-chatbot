import { useEffect, useRef, useState } from "react";

/**
 * GlassOrb — soft out-of-focus glass bead (single fragment shader).
 * Ported from Forge `electric-dune`; Motion in LiquidOrb owns enter/glide/exit.
 *
 * - One draw call, no textures, no Three.js.
 * - Motion terms are integer harmonics of one phase → seamless loop.
 * - Pauses when off-screen, tab hidden, reduced motion, or `paused`.
 */

export type OrbState = "idle" | "listening" | "thinking" | "speaking";
export type OrbShape = "spheres" | "tubes" | "wobbly";

const SHAPES: Record<OrbShape, [number, number]> = {
  spheres: [0, 0],
  tubes: [0.85, 0],
  wobbly: [0, 0.3],
};

export interface OrbColors {
  core: string;
  tint: string;
  rim: string;
  warm: string;
  lilac: string;
  highlight: string;
}

/** Coach-warm palette (aligned with prior liquid orb / sheet). */
export const DEFAULT_COLORS: OrbColors = {
  core: "#4b3a2d",
  tint: "#7a5f8a",
  rim: "#17120f",
  warm: "#fff3db",
  lilac: "#c4a8d8",
  highlight: "#fff6ee",
};

export interface GlassOrbProps {
  state?: OrbState;
  loop?: number;
  radius?: number;
  blur?: number;
  wobble?: number;
  grain?: number;
  cast?: number;
  reach?: number;
  shape?: OrbShape;
  morph?: number;
  shapeSize?: number;
  innerBlur?: number;
  refraction?: number;
  dispersion?: number;
  perspective?: number;
  follow?: boolean;
  level?: number;
  transparent?: boolean;
  background?: string;
  halo?: number;
  colors?: Partial<OrbColors>;
  paused?: boolean;
  className?: string;
}

const TAU = Math.PI * 2;

const PRESETS: Record<OrbState, { energy: number; speed: number }> = {
  idle: { energy: 0.2, speed: 1 },
  listening: { energy: 0.5, speed: 1.25 },
  thinking: { energy: 0.95, speed: 2.4 },
  speaking: { energy: 0.7, speed: 1.7 },
};

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uPhase, uEnergy, uLevel, uRadius, uBlur, uGrain, uBg, uWobble, uCast, uReach, uHalo;
uniform vec3 uBgColor, uCore, uTint, uRim, uWarm, uLilac, uHi;
uniform float uElong, uLump, uMorph, uSize, uInner, uRefract, uDisp, uPersp;
uniform vec2 uView;

vec2 gcL, gcH, gcW, gcP, gcD;
vec2 gmL, gmH, gmW, gmP, gmD;
float gRho, gSf, gBody, gFres, gRimMix, gFade;

float blob(vec2 p, vec2 c, float s){ vec2 d = p - c; return exp(-dot(d, d) / (s * s)); }
vec3 scr(vec3 a, vec3 b){ return 1.0 - (1.0 - a) * (1.0 - b); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float sh(vec2 p, vec2 c, float s, vec2 m, float n, float psi){
  vec2 d = p - c;
  float ang = atan(c.y, c.x) + 1.5708 + 0.5 * sin(uPhase + psi);
  vec2 dir = vec2(cos(ang), sin(ang));
  float se = s * (1.0 - 0.3 * m.x);
  float h = m.x * s;
  vec2 v = d - clamp(dot(d, dir), -h, h) * dir;
  float dist = length(v);
  dist /= 1.0 + m.y * cos(n * atan(v.y, v.x + 1e-5) - 2.0 * uPhase + psi);
  float f = max(dist - gRho * se, 0.0) / (se * gSf);
  return exp(-f * f);
}

vec2 mp(float kk, float o){
  float a = smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(kk * uPhase + o));
  float b = smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(kk * uPhase + o + 2.1));
  return mix(vec2(uElong, uLump), vec2(0.9 * a, 0.38 * b), uMorph);
}

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
  return scr(col, g * gFade);
}

void main(){
  float ph = uPhase;
  float E = uEnergy;
  vec2 uv = (2.0 * gl_FragCoord.xy - uRes) / min(uRes.x, uRes.y);

  float breathe = 1.0 + 0.016 * sin(ph) + 0.045 * uLevel;
  vec2 q = uv / (uRadius * breathe);
  float r = length(q);
  vec2 nq = q / max(r, 1e-4);
  float k = 0.5 + 0.5 * dot(nq, vec2(-0.5547, 0.8321));

  float cp = cos(ph), sp = sin(ph), a3 = 2.0 * ph + 1.0;
  float c2 = nq.x * nq.x - nq.y * nq.y, s2 = 2.0 * nq.x * nq.y;
  float c3 = nq.x * (4.0 * nq.x * nq.x - 3.0), s3 = nq.y * (3.0 - 4.0 * nq.y * nq.y);
  float wob = uWobble * (0.03 + 0.035 * E + 0.03 * uLevel)
            * (0.8 * (c2 * cp + s2 * sp) + 0.6 * (c3 * cos(a3) - s3 * sin(a3)));
  float rw = r / (1.0 + wob);

  vec2 V = 0.4 * vec2(sin(ph + 0.7), sin(2.0 * ph)) + 0.9 * uView;
  vec2 pv = uPersp * V;

  vec2 q2 = q * (1.0 + 0.6 * uRefract * dot(q, q));
  vec2 w = rot(0.32 * sin(ph) * (0.5 + E)) * q2;
  w += (0.03 + 0.05 * E) * vec2(sin(2.6 * w.y + 2.0 * ph + 1.3), cos(2.2 * w.x + ph));
  float oa = 0.05 + 0.13 * E;

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

  gBody = clamp(1.0 + 0.8 * uPersp * dot(q, V), 0.5, 1.6);
  gFres = pow(clamp(r, 0.0, 1.0), 3.0) * uPersp * (0.5 + 0.5 * dot(nq, normalize(V + vec2(1e-3, 0.0))));

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

  float a = 1.0 - smoothstep(1.0 - uBlur, 1.0 + uBlur, rw);
  float edge = max(abs(uv.x), abs(uv.y));
  float boxFade = 1.0 - smoothstep(0.55, 1.0, edge);
  float ha = exp(-max(rw - 1.0, 0.0) * 4.5) * 0.42 * mix(0.35, 1.0, k) * uHalo * boxFade;

  float wW = pow(0.5 + 0.5 * dot(nq, normalize(gcW)), 4.0);
  float wP = pow(0.5 + 0.5 * dot(nq, normalize(gcP)), 4.0);
  float wH = pow(0.5 + 0.5 * dot(nq, normalize(gcH)), 4.0);
  float wL = pow(0.5 + 0.5 * dot(nq, normalize(gcL)), 4.0) * 0.5;
  float tot = wW + wP + wH + wL;
  vec3 sc = (uWarm * wW + uLilac * wP + uHi * wH + uTint * wL) / max(tot, 1e-3);
  float sa = exp(-max(rw - 1.0, 0.0) * 2.2 / max(uReach, 0.05)) * uCast * min(tot, 1.0) * 0.75
           * (0.85 + 0.3 * E + 0.3 * uLevel) * boxFade;

  vec3 bg = uBgColor * (1.0 - 0.16 * smoothstep(0.5, 1.7, length(uv)));
  bg += vec3(0.07, 0.055, 0.04) * blob(uv, vec2(-0.35, -0.55), 0.9);

  vec3 P = bg * uBg;
  float A = uBg;
  P = sc * sa + P * (1.0 - sa);
  A = sa + A * (1.0 - sa);
  P = uRim * ha + P * (1.0 - ha);
  A = ha + A * (1.0 - ha);
  P = col * a + P * (1.0 - a);
  A = a + A * (1.0 - a);

  vec2 gp = floor(gl_FragCoord.xy);
  P += (hash(gp) + hash(gp + 19.19) - 1.0) * uGrain * A;
  gl_FragColor = vec4(P, A);
}
`;

function hexToRgb(
  hex: string,
  fallback: [number, number, number] = [0.66, 0.6, 0.545],
): [number, number, number] {
  let h = (hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return fallback;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
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
    shape = "spheres",
    morph = 0,
    shapeSize = 1,
    innerBlur = 1,
    refraction = 0,
    dispersion = 0,
    perspective = 0.3,
    follow = false,
    level = 0,
    transparent = true,
    background = "#a89a8b",
    halo = 1,
    colors,
    paused = false,
    className,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(
    null as never as Required<Omit<GlassOrbProps, "className" | "colors">> & {
      colors: OrbColors;
    },
  );
  const merged: OrbColors = { ...DEFAULT_COLORS, ...colors };
  propsRef.current = {
    state,
    loop,
    radius,
    blur,
    wobble,
    grain,
    cast,
    reach,
    shape,
    morph,
    shapeSize,
    innerBlur,
    refraction,
    dispersion,
    perspective,
    follow,
    level,
    transparent,
    background,
    halo,
    paused,
    colors: merged,
  };
  const kickRef = useRef<() => void>(() => {});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!gl || !vs || !fs) {
      setFailed(true);
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
      res: U("uRes"),
      phase: U("uPhase"),
      energy: U("uEnergy"),
      level: U("uLevel"),
      radius: U("uRadius"),
      blur: U("uBlur"),
      grain: U("uGrain"),
      bg: U("uBg"),
      bgColor: U("uBgColor"),
      wobble: U("uWobble"),
      halo: U("uHalo"),
      cast: U("uCast"),
      reach: U("uReach"),
      elong: U("uElong"),
      lump: U("uLump"),
      morph: U("uMorph"),
      size: U("uSize"),
      inner: U("uInner"),
      refract: U("uRefract"),
      disp: U("uDisp"),
      persp: U("uPersp"),
      view: U("uView"),
      core: U("uCore"),
      tint: U("uTint"),
      rim: U("uRim"),
      warm: U("uWarm"),
      lilac: U("uLilac"),
      hi: U("uHi"),
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let phase = 0;
    let energy = PRESETS[propsRef.current.state].energy;
    let speed = PRESETS[propsRef.current.state].speed;
    let lvl = 0;
    let vx = 0;
    let vy = 0;
    let tx = 0;
    let ty = 0;
    let last = performance.now();
    let raf = 0;
    let inView = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };

    const setColor = (uniform: WebGLUniformLocation | null, hex: string) => {
      const [r, g, b] = hexToRgb(hex);
      gl.uniform3f(uniform, r, g, b);
    };

    const draw = () => {
      const p = propsRef.current;
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.phase, phase);
      gl.uniform1f(u.energy, energy);
      gl.uniform1f(u.level, lvl);
      gl.uniform1f(u.radius, p.radius);
      gl.uniform1f(u.blur, Math.max(0.005, p.blur));
      gl.uniform1f(u.grain, p.grain);
      gl.uniform1f(u.bg, p.transparent ? 0 : 1);
      gl.uniform1f(u.wobble, p.wobble);
      gl.uniform1f(u.cast, p.cast);
      gl.uniform1f(u.reach, p.reach);
      gl.uniform1f(u.halo, p.halo);
      const [el, lump] = SHAPES[p.shape] ?? SHAPES.spheres;
      gl.uniform1f(u.elong, el);
      gl.uniform1f(u.lump, lump);
      gl.uniform1f(u.morph, p.morph);
      gl.uniform1f(u.size, p.shapeSize);
      gl.uniform1f(u.inner, p.innerBlur);
      gl.uniform1f(u.refract, p.refraction);
      gl.uniform1f(u.disp, p.dispersion);
      gl.uniform1f(u.persp, p.perspective);
      gl.uniform2f(u.view, vx, vy);
      setColor(u.bgColor, p.background);
      setColor(u.core, p.colors.core);
      setColor(u.tint, p.colors.tint);
      setColor(u.rim, p.colors.rim);
      setColor(u.warm, p.colors.warm);
      setColor(u.lilac, p.colors.lilac);
      setColor(u.hi, p.colors.highlight);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const running = () =>
      inView && !document.hidden && !propsRef.current.paused && !mq.matches;

    const frame = (now: number) => {
      raf = 0;
      if (!running()) return;
      const p = propsRef.current;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const t = PRESETS[p.state];
      const e = 1 - Math.exp(-dt * 3);
      energy += (t.energy - energy) * e;
      speed += (t.speed - speed) * e;
      phase = (phase + (dt * TAU * speed) / Math.max(1, p.loop)) % TAU;

      let target = p.level;
      if (p.state === "speaking" && target <= 0) {
        target =
          0.8 * (0.5 + 0.5 * Math.sin(phase * 3) * Math.sin(phase * 5 + 1));
      }
      lvl += (target - lvl) * (1 - Math.exp(-dt * 12));

      const pk = 1 - Math.exp(-dt * 4);
      vx += ((p.follow ? tx : 0) - vx) * pk;
      vy += ((p.follow ? ty : 0) - vy) * pk;

      draw();
      raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (running()) {
        if (!raf) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      } else {
        resize();
        draw();
      }
    };
    kickRef.current = kick;

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([en]) => {
      inView = en.isIntersecting;
      kick();
    });
    io.observe(canvas);
    const onVis = () => kick();
    document.addEventListener("visibilitychange", onVis);
    mq.addEventListener("change", onVis);
    const onPointer = (ev: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      const m = Math.max(b.width, b.height) / 2 || 1;
      tx = Math.max(-1, Math.min(1, (ev.clientX - (b.left + b.width / 2)) / m));
      ty = Math.max(-1, Math.min(1, -(ev.clientY - (b.top + b.height / 2)) / m));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    const onLost = (ev: Event) => {
      ev.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    resize();
    draw();
    kick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mq.removeEventListener("change", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  const colorKey = Object.values(merged).join();
  useEffect(() => {
    kickRef.current();
  }, [
    state,
    loop,
    radius,
    blur,
    wobble,
    grain,
    cast,
    reach,
    shape,
    morph,
    shapeSize,
    innerBlur,
    refraction,
    dispersion,
    perspective,
    follow,
    level,
    transparent,
    background,
    halo,
    paused,
    colorKey,
  ]);

  const fallbackBg = failed
    ? `radial-gradient(circle at 38% 72%, ${merged.warm} 0, transparent 18%), radial-gradient(circle at 62% 30%, ${merged.highlight} 0, transparent 12%), radial-gradient(circle at 40% 28%, ${merged.tint} 0, transparent 22%), radial-gradient(circle at 50% 50%, ${merged.core} 0, ${merged.rim} 24%, transparent 31%), ${transparent ? "transparent" : background}`
    : undefined;

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
  );
}
