import fs from "node:fs";
import path from "node:path";

const SRC_DIR = path.resolve("src");

const RAW_PALETTE_RE =
  /\b(?:bg|text|border|ring|from|via|to|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:\d+|50|950)\b/;

const ARBITRARY_CLASS_RE = /\b[a-z-]+-\[[^\]]+\]/;
const FIGMA_TEMP_URL_RE = /figma\.com\/api\/mcp\/asset/;
const TRANSITION_ALL_RE = /\btransition-all\b/;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];

for (const file of walk(SRC_DIR)) {
  const rel = path.relative(process.cwd(), file);
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    const prev = idx > 0 ? lines[idx - 1] : "";
    const hasEscape =
      line.includes("design-system-escape:") ||
      prev.includes("design-system-escape:");

    if (FIGMA_TEMP_URL_RE.test(line)) {
      violations.push(`${rel}:${idx + 1} Temporary Figma asset URL is forbidden.`);
    }

    if (TRANSITION_ALL_RE.test(line)) {
      violations.push(`${rel}:${idx + 1} "transition-all" is forbidden; specify exact properties.`);
    }

    if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      if (RAW_PALETTE_RE.test(line) && !hasEscape) {
        violations.push(`${rel}:${idx + 1} Non-semantic Tailwind palette utility found: ${line.trim()}`);
      }
      if (ARBITRARY_CLASS_RE.test(line) && !hasEscape) {
        violations.push(`${rel}:${idx + 1} Arbitrary Tailwind value found: ${line.trim()}`);
      }
      if (line.includes("style={{") && !hasEscape) {
        violations.push(`${rel}:${idx + 1} Unlogged inline style={{...}} found (requires // design-system-escape: reason).`);
      }
      if (/\brelative\b/.test(line) && !line.includes("layout-relative-needed:") && !prev.includes("layout-relative-needed:")) {
        violations.push(`${rel}:${idx + 1} Unnecessary "relative" positioning found (use stack-grid/stack-cell or document // layout-relative-needed: reason).`);
      }
    }
  });
}

if (violations.length > 0) {
  console.error("Design system & layout lint violations:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
} else {
  console.log("Design system & layout contract passed with 0 violations.");
}
