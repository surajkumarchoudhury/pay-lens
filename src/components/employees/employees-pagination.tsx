"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

/**
 * URL wiring for the employee pager. Swaps only the `page` param and preserves
 * everything else (filters, sort, currency) by cloning the current query — so
 * callers never have to enumerate params. The presentational <Pagination/> just
 * reports which page was requested.
 */
export function EmployeesPagination({
  page,
  pageSize,
  total,
  pageCount,
}: {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
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
    />
  );
}
