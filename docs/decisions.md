# PayLens — Decision Log

Lightweight ADR-style record of the key decisions and the alternatives we deliberately rejected. Format: **Decision — Reasoning (and what we gave up).**

This file is the single home for "why / why-not." `architecture.md` describes *what* we built; this explains *why*.

---

## D1. PostgreSQL + Prisma, accessed server-side only
**Decision:** Use PostgreSQL with Prisma, reached exclusively from server code (Server Actions), never from the browser.
**Reasoning:** Relational integrity, `DECIMAL` money, and SQL aggregation (`percentile_cont`, `GROUP BY`) fit salary analytics. Prisma adds type-safety, migrations, and ergonomic seeding, with a raw-SQL escape hatch (`$queryRaw`) for the statistical queries it can't express.
**Rejected — Supabase client SDK + RLS:** great for multi-tenant, client-direct apps, but this is a single-persona internal tool. RLS is security-critical complexity with no product payoff here, and `plpgsql` business logic is harder to unit-test than TypeScript. Keeping DB access server-only is a simpler, stronger guarantee (the client is architecturally unable to reach the DB).

## D2. Next.js Server Actions over a separate backend
**Decision:** One Next.js app; server logic in Server Actions/route handlers.
**Reasoning:** Single codebase, clean testable server seam, trivial deploy.
**Rejected — NestJS separate service:** the logic here is moderate; a second deployable service adds ops overhead without proportional benefit.

## D3. Business logic in pure TypeScript, not the database
**Decision:** Currency/frequency normalization, statistics, and validation live in a pure, deterministic TS service layer.
**Reasoning:** The assessment requires fast, deterministic, readable unit tests — far easier against pure TS than `plpgsql`.
**Trade-off:** some DB round-trips instead of in-DB computation, accepted for testability and maintainability.

## D4. Manage salary *records*, not payslips
**Decision:** The core entity is a compensation `SalaryRecord` (base/total comp, currency, frequency, effective date, history), not a per-period payslip.
**Reasoning:** The brief is salary *management + insights*. Payslips are payroll-processing artifacts requiring an earnings/deductions split, per-country tax engines (PF, professional tax, income tax), net-pay, YTD, and work-day/LOP inputs — all out of scope. Cross-country pay comparison should use normalized compensation, not post-tax net pay (which is distorted by each country's tax regime).

## D5. Focused compensation tool, not a full HRMS
**Decision:** PayLens does one domain (salary data + pay analytics) deeply.
**Reasoning:** A full HRMS (greytHR/Workday-style: attendance, leave, benefits, onboarding, ATS, performance) is many modules and personas. The assessment rewards clarity, architecture, and tests — depth over breadth. Breadth would yield a shallow, under-tested result.

## D6. Currency AND frequency normalization -> `annualizedUsd`
**Decision:** Store `Currency.rateToUsd` (FX snapshot); compute `basePayUsd` on write; compute `annualizedUsd = basePayUsd x frequency.annualFactor`. All cross-employee analytics compare on `annualizedUsd`.
**Reasoning:** Salaries differ in both currency and frequency (annual/monthly/hourly). A single canonical value solves both mismatches and keeps analytics fast (no per-query FX joins).
**Rejected — live FX API:** non-deterministic and untestable; a stored snapshot keeps analytics reproducible. A live feed can be swapped in later.

## D7. Money as `DECIMAL`, never floats
**Decision:** `numeric(16,2)` for all monetary values; aggregates only ever use normalized values.
**Reasoning:** Floating point silently corrupts money. (Confirmed by the reference schema's `numeric(16,2)` compensation columns.)

## D8. Database over SQLite
**Decision:** PostgreSQL.
**Reasoning:** SQLite is simplest to run but ephemeral on serverless (breaks "deployed software") and weaker at statistical aggregation. The data-access layer stays thin enough to swap engines if needed.

## D9. Auth: Credentials + session timeouts, role-ready
**Decision:** Auth.js with email/password (argon2). httpOnly, secure, sameSite cookie session with an idle timeout (~30 min) and an absolute timeout (~8 hr). A `role` field (`HR_MANAGER` | `VIEWER`) and an `authorize()` seam gate mutations.
**Reasoning:** Demonstrates real auth understanding (hashing, sessions, timeouts appropriate for sensitive data, protected routes) without over-building. Timeouts matter because salary data is sensitive and terminals get left unattended.
**Rejected — Google/SSO now:** needs external OAuth setup, brittle for a graded demo and deployed URL; documented as a straightforward production add-on. Session rotation is handled by the framework rather than hand-rolled refresh tokens.

## D10. No public sign-up — login-only, provisioned access
**Decision:** No self-service registration. Users are provisioned (seeded now; admin-invite in future). Unauthenticated requests redirect to `/login`; unknown emails fail rather than create accounts.
**Reasoning:** PayLens serves a **single organization** and is **not a multi-tenant system**, so open sign-up is unnecessary and inappropriate for sensitive salary data — anyone signing up would gain access to 10,000 people's pay.

## D11. Multiple HR users; row access is all-or-nothing by design
**Decision:** Support multiple `HR_MANAGER` users, all of whom see all records; `AuditLog.changedBy` identifies who made each change.
**Reasoning:** A 10k-employee org has an HR team. An HR manager is *supposed* to see all salaries, so per-row isolation would break the product. Access control is capability-based (view vs edit), not row-partitioned.

## D12. Optimistic concurrency instead of real-time sync
**Decision:** No real-time/live updates. Guard against lost updates via optimistic concurrency (version/`updatedAt` check on save).
**Reasoning:** There are **no employee roles / self-service actors** at this time — only a small HR team — so live sync adds infra and complexity without real value. The genuine multi-editor risk is a silent lost update, which the concurrency guard prevents cheaply. Fresh reads come from Server Actions + `revalidatePath`.

## D13. Single-organization; multi-tenancy is a documented future extension
**Decision:** Model a single `Organization` (base currency = USD); do not build org-switching or per-org isolation.
**Reasoning:** The brief is explicitly "an organization." Multi-tenancy (`organizationId` scoping on every query + isolation testing + org-switcher UI) is a large commitment with no requirement, and would trade away analytics/test depth.

## D14. No i18n; `Intl`-based formatting only
**Decision:** No multi-language UI. Use `Intl.NumberFormat`/`Intl.DateTimeFormat` for currency symbols, separators, and dates.
**Reasoning:** "Multiple countries" is a data property (currency), not a UI-language requirement; the single HR persona uses one language. Correct money/date *formatting* is still required and cheap.
