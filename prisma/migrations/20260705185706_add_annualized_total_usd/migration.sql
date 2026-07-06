-- Add the denormalized annual total-comp USD column, then backfill existing
-- rows in place. annualizedTotalUsd is a pure function of columns already on
-- the row (annualizedUsd = basePay×rate×factor), so we can compute it without
-- reseeding: annualizedUsd × totalComp / basePay = totalComp×rate×factor.

-- AlterTable: add nullable first so existing rows are allowed.
ALTER TABLE "SalaryRecord" ADD COLUMN "annualizedTotalUsd" DECIMAL(16,2);

-- Backfill. NULLIF guards against a zero basePay; fall back to base annual USD.
UPDATE "SalaryRecord"
SET "annualizedTotalUsd" = COALESCE(
  ROUND("annualizedUsd" * "totalComp" / NULLIF("basePay", 0), 2),
  "annualizedUsd"
);

-- Now enforce NOT NULL to match the schema.
ALTER TABLE "SalaryRecord" ALTER COLUMN "annualizedTotalUsd" SET NOT NULL;

-- CreateIndex
CREATE INDEX "SalaryRecord_annualizedTotalUsd_idx" ON "SalaryRecord"("annualizedTotalUsd");
