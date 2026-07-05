# PayLens

Employee salary management + compensation insights for HR, built for an organization with ~10,000 employees across multiple countries.

Replaces spreadsheet-based salary tracking with a web app to **manage** salary data and **answer "how do we pay people?"** — correctly normalized across currencies and pay frequencies.

> Design artifacts: [`docs/requirements.md`](docs/requirements.md) · [`docs/architecture.md`](docs/architecture.md) · [`docs/decisions.md`](docs/decisions.md)

## Status

Early setup: Next.js + Tailwind + Prisma scaffolding. Data model and features are added incrementally.

## Tech Stack

Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma

## Getting Started (local)

Prerequisites: Node 20+, Docker (for local Postgres).

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres
docker compose up -d

# 3. Configure env
cp .env.example .env

# 4. Run the app
npm run dev
```

App runs at http://localhost:3000.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create/apply Prisma migrations |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:studio` | Open Prisma Studio |
