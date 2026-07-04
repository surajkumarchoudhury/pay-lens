# PayLens — Architecture & Design Notes

## 1. Tech Stack & Rationale

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js (App Router) + TypeScript** | Single codebase for UI + server; Server Actions/route handlers give a clean, testable server seam; trivial to deploy |
| UI | **Tailwind CSS + shadcn/ui** | Accessible, professional components; fast to build data-dense HR screens |
| Data grid | **TanStack Table (server-driven)** | 10k rows can't be client-rendered; pagination/sort/filter pushed to the DB |
| Charts | **Recharts** | Simple, readable analytics visualizations |
| Database | **PostgreSQL** | Relational integrity, `DECIMAL` money, window functions & `percentile_cont` for analytics |
| ORM | **Prisma** | Type-safe queries, first-class migrations, ergonomic seeding |
| Validation | **Zod** | Shared, testable validation on the server boundary |
| Tests | **Vitest** | Fast, deterministic unit tests for the pure business-logic layer |
| Deploy | **Vercel + Neon Postgres** | Zero-ops deployed URL; `docker-compose` for local Postgres |

### Why not the alternatives we considered
- **Supabase client SDK + RLS:** great for multi-tenant apps, but this is a single-persona internal tool. RLS would add security-critical complexity with no product payoff, and business logic in `plpgsql` is harder to unit-test than TypeScript. We keep Postgres, drop client-direct access + RLS.
- **NestJS separate backend:** payroll logic here is moderate; a second deployable service adds ops overhead without proportional benefit. Server Actions give us a clean server layer inside one app.
- **SQLite:** simplest to run, but ephemeral on serverless (breaks "deployed software") and weaker at the statistical aggregation the analytics need. The data-access layer stays thin enough to swap engines.

## 2. Layered Architecture

```
┌───────────────────────────────────────────────┐
│  UI (React Server + Client Components, shadcn) │  pages, tables, charts, forms
├───────────────────────────────────────────────┤
│  Server Actions / Route Handlers               │  thin: parse + authorize + delegate
├───────────────────────────────────────────────┤
│  Business Logic (pure TS, unit-tested)         │  currency normalization, statistics, validation
├───────────────────────────────────────────────┤
│  Data Access (Prisma)                          │  queries, pagination, aggregation
├───────────────────────────────────────────────┤
│  PostgreSQL                                    │  employees, salaries, currencies, audit_log
└───────────────────────────────────────────────┘
```

**Key principle:** the business-logic layer is **pure and deterministic** (no I/O), so it can be unit-tested in isolation. The UI never touches the DB directly.

## 3. Data Model

```
Department ──┐
             ├──< Employee >──< SalaryRecord (current + history) >── Currency
Country ─────┘        │
                      └──< AuditLog (who/what/when for salary changes)
```

- **Employee:** identity, country, department, title/level, join date.
- **SalaryRecord:** `amount DECIMAL`, `currency`, `effectiveDate`, `isCurrent`. History preserved by keeping past records.
- **Currency:** ISO code + **FX rate to USD** (stored snapshot) → enables normalized comparison.
- **AuditLog:** append-only record of salary mutations.

### Money & currency rules
- All amounts stored as `DECIMAL` in the salary's **native currency**.
- A **base-currency (USD) equivalent** is computed via the stored FX rate for any cross-country aggregation.
- Aggregates **never** sum raw amounts across currencies — always the normalized value.

## 4. Performance Considerations (10k employees)

- **Server-side pagination** — fetch only the visible page; never ship 10k rows to the browser.
- **Indexes** on `country`, `department`, `title`, and full-text/`ILIKE` search columns.
- **DB-side aggregation** — analytics computed with SQL (`GROUP BY`, `percentile_cont`, `avg`) rather than in app memory.
- **Normalized amount** can be denormalized/stored on the salary row to avoid per-query FX joins if needed.
- 10k rows is small for Postgres; the discipline is in the UI/query patterns, not raw DB scale.

## 5. Testing Strategy

- **Unit tests (Vitest)** on the pure logic layer: currency conversion, percentile/median/avg math, salary validation, distribution bucketing.
- Tests are **fast** (no DB), **deterministic** (fixed FX snapshot & fixtures), and **readable** (arrange/act/assert).
- Rationale: the assessment rewards meaningful coverage of *core functionality* — the correctness-critical parts are the money math and statistics, so that's where tests concentrate.

## 6. Trade-offs Summary

| Decision | Trade-off accepted |
|----------|--------------------|
| Postgres over SQLite | Slightly more setup, in exchange for correct money handling, real deploy, and SQL analytics |
| Stored FX snapshot over live API | Rates can go stale, in exchange for deterministic, testable analytics |
| Single role, no RLS | No multi-tenant isolation, appropriate for a single-persona internal tool |
| Logic in TS not plpgsql | Some DB round-trips, in exchange for testability and maintainability |
