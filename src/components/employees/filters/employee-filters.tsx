import type { EmployeeLevelId } from "@/lib/employee-level";
import type { SearchFieldId } from "@/lib/employee-search";
import type { EmployeeStatusId } from "@/lib/employee-status";
import type { CurrencyOption } from "@/lib/employees";

import type { OrgCurrency } from "../employees-table";
import { AddEmployeeButton } from "./add-employee-button";
import { ClearFiltersButton } from "./clear-filters-button";
import { ColumnSettingsButton } from "./column-settings-button";
import { CompensationFilter } from "./compensation-filter";
import { CurrencyFilter } from "./currency-filter";
import { DateFilter } from "./date-filter";
import { EmployeesSearch } from "./employees-search";
import { ExportButton } from "./export-button";
import { LevelFilter } from "./level-filter";
import { StatusFilter } from "./status-filter";

export type EmployeeFilterValues = {
  query: string;
  field: SearchFieldId;
  salaryMin: string;
  salaryMax: string;
  totalCompMin: string;
  totalCompMax: string;
  compaMin: string;
  compaMax: string;
  levels: EmployeeLevelId[];
  statuses: EmployeeStatusId[];
  hireDateFrom: string;
  hireDateTo: string;
  effectiveDateFrom: string;
  effectiveDateTo: string;
};

/**
 * Toolbar composing the employee filters. Add future facets (level, country,
 * department, status) alongside these — each owns its own URL params.
 */
export function EmployeeFilters({
  currencies,
  orgCurrency,
  values,
  canManage,
}: {
  currencies: CurrencyOption[];
  orgCurrency: OrgCurrency;
  values: EmployeeFilterValues;
  canManage: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      {/* Filters wrap within their own flexible group so growing/adding facets
          pushes onto a new line instead of shoving the view controls. */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/*
          Key by the committed query + field so the search input re-seeds its
          local state whenever the URL changes (submit, suggestion select, or
          "Clear filters") — no prop→state mirroring needed inside the component.
          Typing doesn't touch these params, so it never remounts mid-keystroke.
        */}
        <EmployeesSearch
          key={`${values.field}:${values.query}`}
          query={values.query}
          field={values.field}
        />
        <CompensationFilter
          currencies={currencies}
          values={{
            salaryMin: values.salaryMin,
            salaryMax: values.salaryMax,
            totalCompMin: values.totalCompMin,
            totalCompMax: values.totalCompMax,
            compaMin: values.compaMin,
            compaMax: values.compaMax,
          }}
        />
        <LevelFilter value={values.levels} />
        <StatusFilter value={values.statuses} />
        <DateFilter
          values={{
            hireDateFrom: values.hireDateFrom,
            hireDateTo: values.hireDateTo,
            effectiveDateFrom: values.effectiveDateFrom,
            effectiveDateTo: values.effectiveDateTo,
          }}
        />
        <ClearFiltersButton />
      </div>
      {/* View controls (how data is shown) sit apart from the filters and stay
          pinned to the right, top-aligned as the filters wrap. */}
      <div className="flex shrink-0 items-center gap-2">
        <CurrencyFilter
          currencies={currencies}
          orgCurrencyCode={orgCurrency.code}
        />
        <ExportButton />
        <ColumnSettingsButton />
        {canManage && <AddEmployeeButton />}
      </div>
    </div>
  );
}
