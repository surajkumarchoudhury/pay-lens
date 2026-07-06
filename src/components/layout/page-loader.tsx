import { Spinner } from "@/components/ui/spinner";

/**
 * Full-area loading indicator for route-level `loading.tsx` files. Renders a
 * centered spinner in the main content region (the sidebar + header stay put,
 * since `loading.tsx` streams into the authenticated layout's children slot).
 * `flex-1` makes it grow to fill `<main>` (a flex column), so the spinner sits
 * dead-center of the content area.
 */
export function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full flex-1 flex-col items-center justify-center gap-3"
    >
      <Spinner className="size-10" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
