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

| Excluded | Reasoning |
|----------|-----------|
| Employee self-service / multiple roles / RLS | Single-persona internal tool; multi-tenant security would be effort without value here |
| Real payroll disbursement, tax engines, payslip PDFs | Out of the problem statement (management & insight, not payroll processing); high complexity, low assessment signal |
| Live FX-rate API | Non-deterministic and untestable; a **stored FX snapshot** keeps analytics reproducible and unit-testable. Rates are modeled so a live feed could be swapped in later |
| Approval workflows / notifications | Adds process complexity beyond the core "manage + understand salaries" goal |
| Bulk Excel import | Valuable follow-up, but seeding + CRUD demonstrate the data model sufficiently within scope |

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
