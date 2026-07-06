import Link from "next/link";
import { Plus } from "lucide-react";

import { Tooltip } from "@/components/ui/tooltip";

/**
 * Entry point to the create-employee flow. HR-only (rendered conditionally by
 * the toolbar). Uses the "Pay" brand red so the primary create action stands
 * out among the neutral view controls.
 */
export function AddEmployeeButton() {
  return (
    <Tooltip label="Add employee">
      <Link
        href="/employees/new"
        aria-label="Add employee"
        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-red-700 bg-red-600 transition-colors hover:bg-red-700"
      >
        <Plus className="size-5 text-white dark:text-white" strokeWidth={3} />
      </Link>
    </Tooltip>
  );
}
