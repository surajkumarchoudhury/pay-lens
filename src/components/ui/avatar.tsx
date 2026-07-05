import { cn, initials } from "@/lib/utils";

/**
 * Circular avatar. Renders the image when `src` is present, otherwise falls
 * back to the person's initials on a muted tile.
 */
export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const base = "shrink-0 overflow-hidden rounded-full";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn(base, "size-9 object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        base,
        "grid size-9 place-items-center bg-muted text-xs font-medium text-foreground",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
