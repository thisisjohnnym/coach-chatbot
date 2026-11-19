# AGENTS.md — Coach Chatbot (`coach-chatbot`)

Read this file first. You do **not** need to scan the repo, Git remotes, or Vercel projects to understand how this project builds and deploys.

## Canonical Project & Deployment Map

- **Package name**: `coach-ai-gift-assistant` (React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + Motion)
- **Package manager**: `pnpm` (`pnpm-lock.yaml` v9, `esbuild` allowed in `pnpm-workspace.yaml`)
- **GitHub repository**: `https://github.com/thisisjohnnym/coach-chatbot.git` (`origin`, production branch: `main`)
- **Vercel team / scope**: `thisisjohnnym-9611s-projects` (`team_sF7KPwRiQzgFjGjeHymUMh7W` — "My Portfolio")
- **Vercel account**: `thisisjohnnym-9611`
- **Vercel project**: `coach-chatbot` (`prj_CQGpinzBVUmUNvrDsHly0W6i85YV`)
- **Production URL**: `https://coach-chatbot.vercel.app`
- **Environment variables**: **None required** (100% client-side prototype; product catalog and scripted responses live in `src/data/catalog.ts`)
- **Full deployment runbook**: [`docs/ops/deployment.md`](docs/ops/deployment.md)

## Required Checks Before Every Commit or Deploy

Always run both commands from the repository root before pushing or deploying:

```bash
pnpm lint && pnpm build
```

1. `pnpm lint` runs `scripts/lint-design-system.mjs` (enforces semantic design tokens, bans `transition-all`, temporary Figma asset URLs, unlogged `style={{...}}`, and undocumented `relative` classes).
2. `pnpm build` runs `tsc -b && vite build` (strict TypeScript build + Vite bundle into `dist/`).

## Fast Deploy Reference (Zero Discovery Needed)

### Default: Deploy via Git Push (Recommended)

Vercel Git integration is active on `thisisjohnnym/coach-chatbot`:

- **Production**: Commit to `main` and run `git push origin main` → Vercel automatically builds and updates `https://coach-chatbot.vercel.app`.
- **Preview**: Push any non-`main` branch → Vercel automatically builds a preview URL.

### Fallback: Deploy via Vercel CLI

If deploying directly from a machine or fresh clone:

```bash
# 1. Only if .vercel/project.json does not exist locally:
vercel link --yes --scope thisisjohnnym-9611s-projects --project coach-chatbot

# 2. Preview deploy:
vercel deploy --yes

# 3. Production deploy:
vercel deploy --prod --yes
```

Never create a duplicate Vercel project (e.g. `chat-assistant` or `coach-ai-gift-assistant`). Always target `--scope thisisjohnnym-9611s-projects --project coach-chatbot`.
