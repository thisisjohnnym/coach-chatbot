# Coach — Ask Coach AI Prototype

Interactive mobile storefront and **Ask Coach** shopping assistant prototype built with React 19, TypeScript, Vite 7, Tailwind CSS v4, and Motion.

- **Live Production**: [https://coach-chatbot.vercel.app](https://coach-chatbot.vercel.app)
- **GitHub Repository**: [https://github.com/thisisjohnnym/coach-chatbot](https://github.com/thisisjohnnym/coach-chatbot)
- **Deployment Runbook**: [`docs/ops/deployment.md`](docs/ops/deployment.md)
- **Agent Guardrails**: [`AGENTS.md`](AGENTS.md)

## Local Development

Use `pnpm` for package management:

```bash
pnpm install
pnpm dev
```

### URL Query Modes

- `?spot=general` (default) — Opens Cold Start stage from the inline PLP content spot.
- `?spot=prompted` — Opens directly into a prompted statement-bag recommendation flow.

## Quality Checks & Build

```bash
pnpm lint        # Design-system & layout contract check
pnpm typecheck   # TypeScript check (tsc -b --noEmit)
pnpm build       # Production TypeScript + Vite build -> dist/
pnpm preview     # Preview production bundle locally
```

## Deployment

Pushes to `main` on `thisisjohnnym/coach-chatbot` automatically deploy to production on Vercel at [https://coach-chatbot.vercel.app](https://coach-chatbot.vercel.app). See [`docs/ops/deployment.md`](docs/ops/deployment.md) for CLI commands, project IDs, and rollback steps.
