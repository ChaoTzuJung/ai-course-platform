# AI Course Platform

A two-sided, AI-powered online course platform. Instructors author courses
(modules → lessons → quizzes); learners browse, enroll, watch lessons, track
progress, and take quizzes. Two AI features sit in the core loop:

- **AI tutor chat** — learners chat with a tutor grounded in the current lesson.
- **AI quiz generation** — instructors generate draft quiz questions from a
  lesson's content, then review and edit before saving.

It runs **end-to-end with zero configuration** (stub AI + dev-login), and
upgrades to real providers via environment variables — no code changes.

See [`docs/spec.md`](docs/spec.md) for the full product spec.

## Tech stack

React Router 7 (SSR) · React 19 · TypeScript · Vite 7 · Tailwind CSS 4 +
shadcn/ui · Drizzle ORM + SQLite (better-sqlite3) · Vercel AI SDK (v5) ·
Clerk (optional) · Vitest · pnpm.

## Quick start

```bash
pnpm install
pnpm db:generate   # generate the migration (already committed)
pnpm db:migrate    # create data.db
pnpm db:seed       # seed users, courses, a quiz
pnpm dev           # http://localhost:5173
```

With no env vars set, the app runs in **stub AI + dev-login** mode. Open the app
and you'll be sent to `/dev/login` to pick a seeded user:

| User | Role |
|------|------|
| `instructor@example.com` | Instructor |
| `student@example.com` | Student |
| `admin@example.com` | Admin |

## Configuration

Copy `.env.example` to `.env` and fill in what you need. Everything is optional.

### AI provider

| `AI_PROVIDER` | Requires | Behavior |
|---------------|----------|----------|
| _(unset)_ / `stub` | nothing | Deterministic canned tutor replies + placeholder quiz questions. |
| `openai` | `OPENAI_API_KEY` | Real AI via OpenAI (`OPENAI_MODEL`, default `gpt-4.1`). |
| `anthropic` | `ANTHROPIC_API_KEY` | Real AI via Claude (`ANTHROPIC_MODEL`, default `claude-opus-4-8`). |

If `AI_PROVIDER` is unset it auto-detects: Anthropic key → Anthropic, else
OpenAI key → OpenAI, else stub. Provider selection lives entirely in
`app/lib/ai/provider.server.ts`.

### Authentication

| Mode | Requires | Behavior |
|------|----------|----------|
| Dev-login _(default)_ | nothing | Pick a seeded user at `/dev/login`. |
| Clerk | `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | Real Clerk auth; a user mirror row is created on first sign-in. Dev-login is disabled. |

## Scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm typecheck` | `react-router typegen && tsc` |
| `pnpm test` | Vitest (scoring, progress, schema/migrations) |
| `pnpm db:generate` / `db:migrate` / `db:seed` | Drizzle migration + seed |

## Project layout

```
app/
  db/            schema.ts (Drizzle), enums.ts (client-safe), index.ts
  lib/
    ai/          provider.server, tutor.server, quizgen.server
    session.server.ts, validation.ts, markdown.server.ts, utils.ts
  services/      domain logic (one file per domain) + co-located tests
  components/    ui/ (shadcn-style), tutor-chat, quiz-editor
  routes/        file-based routes (see app/routes.ts)
drizzle/         generated migrations
scripts/seed.ts  seed data
docs/spec.md     product requirements
```
