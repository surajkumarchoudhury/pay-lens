# PayLens — Requirements Document

> One-page requirements for an employee salary management tool for **ACME Org** (~10,000 employees, multiple countries).

## 1. Goal

Replace ACME HR's error-prone, Excel-based salary tracking with a **web-based salary management tool** that lets a single HR Manager:

1. **Manage** salary data for ~10,000 employees (view, search, filter, create, update).
2. **Answer questions about how the org pays people** — org-wide, and sliced by country, department, and role — despite salaries being paid in **different currencies**.

The second point is the product's real value: not just a CRUD grid, but an **insights tool**.

## 2. User Persona

**HR Manager** — a single, trusted internal operator. Not employee self-service. This shapes scope: no multi-tenant isolation, no per-employee logins, a single privileged role.

## 3. In Scope (Features)

| # | Feature | Why it matters |
|---|---------|----------------|
| F1 | **Employee salary directory** — server-side paginated, searchable, filterable table over 10k rows | Core daily workflow; must stay fast at scale |
| F2 | **CRUD** on employee + salary records with validation | Replaces manual Excel editing |
| F3 | **Audit trail** of salary changes | Salary data is sensitive; changes must be traceable |
| F4 | **Multi-currency normalization** — store native currency + amount, plus a base-currency (USD) equivalent via stored FX snapshot | Cannot compare/sum salaries across countries otherwise |
| F5 | **Analytics dashboard** — headcount, total & average comp (currency-normalized), pay by country / department / role, min/median/max & percentiles, distribution | Directly answers "how do we pay people?" |
| F6 | **Seed script** generating 10,000 realistic employees across countries/currencies | Required for realistic demo & performance |

## 4. Out of Scope (Deliberate) — and Why

See [`decisions.md`](decisions.md) for full reasoning on each exclusion.

| Excluded | Reasoning |
|----------|-----------|
| **Payroll processing & payslips** (earnings/deductions breakdown, PF/PT/income-tax, net pay, YTD, LOP) | PayLens manages **compensation records**, not per-period payroll artifacts. Payslips need per-country tax engines; cross-country comparison uses currency-normalized comp, not post-tax net pay |
| **Full HRMS breadth** (attendance, leave, benefits, onboarding, ATS, performance) | Focused compensation + insights tool, not a greytHR/Workday-style suite; depth over breadth |
| **Multi-tenancy / multiple organizations / org-switching** | Brief is a single organization; per-org isolation is a large commitment with no requirement |
| **Public sign-up / self-registration** | Single org, not multi-tenant; open registration is inappropriate for sensitive salary data. Access is provisioned (login-only) |
| **Real-time / live collaborative updates** | Only a small HR team operates the tool (no employee/self-service actors); lost-update risk is handled by optimistic concurrency instead |
| **Per-row access control / RLS** | An HR manager is meant to see all salaries; access is capability-based (view vs edit), not row-partitioned |
| **Live FX-rate API** | Non-deterministic and untestable; a **stored FX snapshot** keeps analytics reproducible. A live feed can be swapped in later |
| **Multi-language i18n** | "Multiple countries" is a data property (currency), not UI language; single persona, one language. `Intl`-based money/date formatting is in scope |
| Approval workflows / notifications, bulk Excel import | Beyond the core "manage + understand salaries" goal; seeding + CRUD demonstrate the model sufficiently |

## 5. Non-Functional Requirements

- **Correctness of money:** all monetary values stored as `DECIMAL` (never floats); currency never mixed in aggregates.
- **Performance:** directory & analytics must remain responsive at 10k rows via DB-side pagination, indexing, and aggregation.
- **Testability:** core logic (currency conversion, statistics, validation) is pure, deterministic, and unit-tested.
- **Maintainability:** clear separation between data access, business logic, and UI.

## 6. Success Criteria

- HR Manager can find any employee and edit their salary in seconds.
- Dashboard answers "what do we pay, by country/department/role?" at a glance, correctly normalized to a base currency.
- 10k-employee seed runs and the app stays fast.
- Core logic is covered by fast, deterministic unit tests.
