/**
 * Pagination constants shared by the server data layer and client UI. Kept in
 * its own module (no `server-only`) so client components — e.g. the pager's
 * page-size picker — can import them without pulling in the Prisma layer.
 */

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
