"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

/**
 * URL wiring for any paged table. Swaps only the `page` / `pageSize` params and
 * preserves everything else (filters, sort, etc.) by cloning the current query —
 * so callers never enumerate params. The presentational <Pagination/> just
 * reports the requested page/size. `noun` sets the "of N …" label per table.
 */
export function TablePagination({
  page,
  pageSize,
  total,
  pageCount,
  noun = "employees",
}: {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  noun?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onPageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  // Changing page size invalidates the current offset, so jump back to page 1.
  const onPageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", String(size));
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <Pagination
      page={page}
      pageSize={pageSize}
      total={total}
      pageCount={pageCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      isPending={isPending}
      noun={noun}
    />
  );
}
