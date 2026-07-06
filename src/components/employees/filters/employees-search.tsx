"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { useDebouncedSuggestions } from "@/hooks/use-debounced-suggestions";
import {
  DEFAULT_SEARCH_FIELD,
  SEARCH_FIELDS,
  searchFieldLabel,
  searchFieldPlaceholder,
  type SearchFieldId,
  type SearchSuggestion,
} from "@/lib/employee-search";

/**
 * Employee search. Two coupled controls:
 *  - a text input that only fires on Enter (submit), never per-keystroke;
 *  - a "Search by" dropdown to pick which field to search — single-select with
 *    a tick, committing immediately (mirrors the currency picker; no Apply).
 *
 * State of record is the URL (`q`, `field`), consistent with sorting/paging.
 */
export function EmployeesSearch({
  query,
  field,
}: {
  query: string;
  field: SearchFieldId;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [term, setTerm] = useState(query);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { suggestions, loading } = useDebouncedSuggestions<SearchSuggestion>({
    endpoint: "/api/employees/suggest",
    term,
    params: { field },
  });

  const pushSearch = (nextField: SearchFieldId, nextTerm: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const t = nextTerm.trim();
    if (t) params.set("q", t);
    else params.delete("q");
    // Only persist a non-default field to keep URLs clean.
    if (nextField !== DEFAULT_SEARCH_FIELD) params.set("field", nextField);
    else params.delete("field");
    // A new query invalidates the current page offset.
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    pushSearch(field, term);
  };

  const onClear = () => {
    setTerm("");
    setShowSuggestions(false);
    pushSearch(field, "");
  };

  const onSelectSuggestion = (value: string) => {
    setTerm(value);
    setShowSuggestions(false);
    pushSearch(field, value);
  };

  const suggestionsVisible = showSuggestions && term.trim().length > 0;

  return (
    <form onSubmit={onSubmit} className="relative w-full min-w-[275px] max-w-sm">
      {/* Single combined control: the text field and the "Search by" selector
          share one bordered group, split by a divider. */}
      <div className="flex h-9 items-center rounded-xs border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
        <Search className="pointer-events-none ml-3 size-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setShowSuggestions(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowSuggestions(false);
          }}
          placeholder={searchFieldPlaceholder(field)}
          aria-label={`Search employees by ${searchFieldLabel(field).toLowerCase()}`}
          role="combobox"
          aria-expanded={suggestionsVisible}
          aria-controls="employee-search-suggestions"
          aria-autocomplete="list"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        {term.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="mr-1 grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}

        <span className="h-5 w-px shrink-0 bg-border" aria-hidden />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Search field"
              className="inline-flex h-full shrink-0 cursor-pointer items-center gap-1.5 rounded-r-xs px-3 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <span className="font-medium">{searchFieldLabel(field)}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 max-h-72 w-48 overflow-auto rounded-md bg-popover p-1 text-popover-foreground shadow-md focus-visible:outline-none"
            >
              <DropdownMenu.RadioGroup
                value={field}
                onValueChange={(v) => pushSearch(v as SearchFieldId, term)}
              >
                {SEARCH_FIELDS.map((f) => (
                  <DropdownMenu.RadioItem
                    key={f.id}
                    value={f.id}
                    className="flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none transition-colors data-highlighted:bg-muted"
                  >
                    <span className="grid w-4 shrink-0 place-items-center">
                      <DropdownMenu.ItemIndicator>
                        <Check className="size-3.5 text-primary" />
                      </DropdownMenu.ItemIndicator>
                    </span>
                    {f.label}
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {suggestionsVisible && (
          <ul
            id="employee-search-suggestions"
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border border-border/60 bg-popover py-1 text-popover-foreground shadow-md"
          >
            {loading ? (
              <li
                role="option"
                aria-selected={false}
                aria-busy
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"
              >
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </li>
            ) : suggestions.length === 0 ? (
              <li
                role="option"
                aria-selected={false}
                className="px-3 py-2 text-sm text-muted-foreground"
              >
                No matches found
              </li>
            ) : (
              suggestions.map((s) => (
                <li
                  key={`${s.value}-${s.subLabel ?? s.hint ?? ""}`}
                  role="option"
                  aria-selected={false}
                >
                  <button
                    type="button"
                    // preventDefault on mousedown keeps focus in the input so the
                    // onBlur-driven close doesn't fire before this click lands.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelectSuggestion(s.value)}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                  >
                    {s.subLabel !== undefined ? (
                      // Person card: avatar · name over email, mirroring the table.
                      <>
                        <Avatar
                          name={s.label}
                          src={s.avatarUrl}
                          className="size-7 text-[10px]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {s.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {s.subLabel}
                          </span>
                        </span>
                      </>
                    ) : (
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="truncate">{s.label}</span>
                        {s.hint && (
                          <span className="shrink-0 truncate text-xs text-muted-foreground">
                            {s.hint}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
    </form>
  );
}
