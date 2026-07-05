-- Add the denormalized compa-ratio column, then backfill existing rows in
-- place so we don't need to reseed. Compa-ratio = annualizedUsd ÷ band midpoint,
-- where the midpoint = LEVEL_BASE_USD[level] × COUNTRY_MULTIPLIER[country]. Those
-- band constants live in src/lib/salary-bands.ts; the CASE tables below are a
-- point-in-time snapshot of them purely to backfill. New/updated rows get the
-- value from the write path (seed/app), which imports the shared definition.

-- AlterTable: add nullable first so existing rows are allowed.
ALTER TABLE "SalaryRecord" ADD COLUMN "compaRatio" DECIMAL(8,4);

-- Backfill by joining to the employee for level + country, mirroring
-- bandMidpointUsd(). NULLIF guards a zero midpoint; fall back to 1.0.
UPDATE "SalaryRecord" sr
SET "compaRatio" = COALESCE(
  ROUND(
    sr."annualizedUsd" / NULLIF(
      (CASE e."level"
        WHEN 'L1' THEN 45000
        WHEN 'L2' THEN 65000
        WHEN 'L3' THEN 90000
        WHEN 'L4' THEN 120000
        WHEN 'L5' THEN 160000
        WHEN 'L6' THEN 210000
        WHEN 'L7' THEN 280000
      END)::numeric
      * (CASE e."countryIso2"
        WHEN 'US' THEN 1.0
        WHEN 'GB' THEN 0.9
        WHEN 'DE' THEN 0.9
        WHEN 'FR' THEN 0.85
        WHEN 'CA' THEN 0.85
        WHEN 'AU' THEN 0.85
        WHEN 'SG' THEN 0.8
        WHEN 'JP' THEN 0.8
        WHEN 'BR' THEN 0.4
        WHEN 'ZA' THEN 0.45
        WHEN 'IN' THEN 0.35
        ELSE 0.7
      END)::numeric,
    0),
    4),
  1.0
)
FROM "Employee" e
WHERE sr."employeeId" = e."id";

-- Now enforce NOT NULL to match the schema.
ALTER TABLE "SalaryRecord" ALTER COLUMN "compaRatio" SET NOT NULL;

-- CreateIndex
CREATE INDEX "SalaryRecord_compaRatio_idx" ON "SalaryRecord"("compaRatio");
