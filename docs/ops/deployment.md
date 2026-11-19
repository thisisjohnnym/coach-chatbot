# Deployment Runbook — `coach-chatbot`

This document contains every identifier, build setting, and command needed to deploy, inspect, or roll back this project. **Agents should use these exact values directly instead of scanning Git remotes, Vercel teams, or project lists.**

---

## 1. Canonical Identifiers

| Item | Value |
| --- | --- |
| **GitHub Repository** | `https://github.com/thisisjohnnym/coach-chatbot.git` |
| **Git Remote Name** | `origin` |
| **Production Branch** | `main` |
| **Vercel Account (User)** | `thisisjohnnym-9611` (`thisisjohnnym@gmail.com`) |
| **Vercel Team / Scope Slug** | `thisisjohnnym-9611s-projects` (*My Portfolio*) |
| **Vercel Org / Team ID** | `team_sF7KPwRiQzgFjGjeHymUMh7W` |
| **Vercel Project Name** | `coach-chatbot` |
| **Vercel Project ID** | `prj_CQGpinzBVUmUNvrDsHly0W6i85YV` |
| **Production Alias** | `https://coach-chatbot.vercel.app` |
| **Vercel Dashboard** | `https://vercel.com/thisisjohnnym-9611s-projects/coach-chatbot` |

> **Important naming note**: `package.json` uses `"name": "coach-ai-gift-assistant"` and the local folder may be named `chat-assistant`, but the Vercel project is **`coach-chatbot`**. Never run `vercel` or `vercel link` without specifying `--project coach-chatbot` on an unlinked directory, or Vercel CLI may create a duplicate project named after the folder.

---

## 2. Build & Environment Contract

Defined in [`vercel.json`](../../vercel.json) and [`package.json`](../../package.json):

- **Framework Preset**: `vite`
- **Package Manager**: `pnpm` (`pnpm-lock.yaml` lockfile v9; Vercel uses `pnpm@10.x` automatically, with `esbuild` postinstall allowed via `pnpm-workspace.yaml`)
- **Install Command**: `pnpm install`
- **Build Command**: `pnpm build` (`tsc -b && vite build`)
- **Output Directory**: `dist`
- **Environment Variables**: **None**. All catalog items, static assets (`public/assets/figma/`, `public/fonts/`), and assistant flows are bundled client-side. No `.env` pull is required to build or run.

---

## 3. Pre-Deploy Verification (Mandatory)

Run from the repository root before every commit or CLI deploy:

```bash
pnpm lint && pnpm build
```

- `pnpm lint` executes `scripts/lint-design-system.mjs` and fails on non-semantic Tailwind palette classes, arbitrary `[...]` utilities, `transition-all`, temporary Figma asset URLs, or undocumented inline styles / `relative` positioning.
- `pnpm build` validates strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`) and emits the Vite bundle to `dist/`.

---

## 4. How to Deploy

### Workflow A — Git Push (Default / Preferred)

The GitHub repo `thisisjohnnym/coach-chatbot` is connected directly to Vercel (`thisisjohnnym-9611s-projects/coach-chatbot`).

1. **Production release**:
   ```bash
   pnpm lint && pnpm build
   git add -A
   git commit -m "<concise change summary>"
   git push origin main
   ```
   Vercel automatically builds `main` and assigns `https://coach-chatbot.vercel.app`.

2. **Preview release (PR / branch testing)**:
   ```bash
   git checkout -b feat/<short-name>
   git push -u origin feat/<short-name>
   ```
   Vercel automatically builds a unique preview URL for every push to non-`main` branches.

### Workflow B — Direct Vercel CLI Deploy

Use when deploying uncommitted local work for a quick preview or when triggering a direct CLI deploy from an authenticated terminal.

1. **Verify CLI authentication**:
   ```bash
   vercel whoami
   # Expected stdout: thisisjohnnym-9611
   ```

2. **Ensure `.vercel/project.json` is linked** (only needed once per clone):
   ```bash
   vercel link --yes --scope thisisjohnnym-9611s-projects --project coach-chatbot
   ```
   Expected `.vercel/project.json` IDs:
   - `orgId`: `team_sF7KPwRiQzgFjGjeHymUMh7W`
   - `projectId`: `prj_CQGpinzBVUmUNvrDsHly0W6i85YV`

3. **Run Preview or Production deploy**:
   ```bash
   # Preview URL (safe for testing):
   vercel deploy --yes

   # Production URL (updates https://coach-chatbot.vercel.app):
   vercel deploy --prod --yes
   ```

---

## 5. Verification, Logs & Rollback

```bash
# Check latest deployments and status (READY / BUILDING / ERROR)
vercel ls coach-chatbot --scope thisisjohnnym-9611s-projects

# Inspect current live production deployment metadata & aliases
vercel inspect https://coach-chatbot.vercel.app

# Verify HTTP 200 on production
curl -sI https://coach-chatbot.vercel.app | head -n 5

# View runtime/build error logs
vercel logs https://coach-chatbot.vercel.app

# Roll back production to the previous deployment
vercel rollback --scope thisisjohnnym-9611s-projects --yes
```

> **Rollback caveat**: Running `vercel rollback` pauses automatic production domain assignment for subsequent Git pushes until `vercel promote <deployment-url> --scope thisisjohnnym-9611s-projects --yes` is run.

---

## 6. CI / Headless Automation Reference (Optional)

If adding GitHub Actions or external CI runners in the future, configure these repository secrets (never commit tokens):

- `VERCEL_TOKEN`: Vercel personal/team access token
- `VERCEL_ORG_ID`: `team_sF7KPwRiQzgFjGjeHymUMh7W`
- `VERCEL_PROJECT_ID`: `prj_CQGpinzBVUmUNvrDsHly0W6i85YV`
