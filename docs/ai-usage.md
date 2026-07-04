# PayLens — AI Usage Notes

This project was built in an AI-assisted workflow. This document records **how** AI was used, intentionally and with human oversight, rather than as a black box.

## Approach

1. **Problem framing first.** Before any code, AI was used as a thinking partner to pressure-test the architecture: Supabase-direct vs Server Actions, RLS vs single-role, plpgsql vs TypeScript business logic, Postgres vs SQLite. Each decision was made against the actual constraints (single HR persona, 10k rows, multi-country, testability) — not defaults.
2. **Artifacts before implementation.** The requirements and architecture docs were written up front to lock scope and design, then drove the build.
3. **Incremental, reviewable commits.** Work was committed in small logical steps so the evolution is legible.

## Key decisions where AI recommendations were accepted or overridden

| Topic | AI-assisted conclusion | Reasoning |
|-------|------------------------|-----------|
| Backend shape | Server Actions over separate NestJS | One persona, moderate logic — a second service wasn't justified |
| Data access | Server-layer access over client-direct Supabase SDK + RLS | Sensitive salary data; keep a controlled server seam and avoid RLS complexity for a single role |
| Business logic | Pure TypeScript, not plpgsql functions | Explicit requirement for fast, deterministic, readable unit tests |
| Database | Postgres over SQLite | Correct money handling, real deployment, SQL analytics |
| Multi-country | Store native currency + stored FX snapshot to USD | Enables correct, testable cross-country comparison |

## Guardrails applied

- **Correctness over convenience:** money as `DECIMAL`, never floats; aggregates always currency-normalized.
- **Determinism:** FX rates are a stored snapshot so analytics and tests are reproducible.
- **Verification:** core logic covered by unit tests rather than trusting generated code blindly.

## Prompts (representative)

- "HR salary tool, 10k employees, multiple countries, single HR persona — recommend a stack optimized for clean architecture, testability, and easy deploy."
- "Compare Supabase-direct + RLS vs Server Actions for sensitive salary data."
- "Design a data model that supports multi-currency salaries and currency-normalized analytics."
- "Where should unit tests concentrate for maximum signal on correctness?"
