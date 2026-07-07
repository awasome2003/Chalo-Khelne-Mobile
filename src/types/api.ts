/**
 * Shared API response types — the single source of truth for how the backend
 * wraps data. Defined here so every data hook (Phase 3, TanStack Query) parses
 * responses ONE way instead of the current 4-different-ways-per-screen drift
 * (see BOOKINGS.BY_USER handling across MyEvents / MyBookings / PaymentHistory).
 *
 * Phase 0 seed. Grow this file as screens/modules are converted to TypeScript.
 */

/** Standard success envelope: `{ success: true, data: T }`. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * The backend has been observed returning a list four ways for the same route:
 * a raw array, `{ data: [] }`, `{ bookings: [] }`, or `{ payments: [] }`.
 * Use `unwrapList` (below) to normalize — do not re-implement per screen.
 */
export type ListResponse<T> =
  | T[]
  | { data: T[] }
  | { bookings: T[] }
  | { payments: T[] };

/** Normalize any of the observed list shapes into a plain array. */
export function unwrapList<T>(res: ListResponse<T> | null | undefined): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray((res as { data?: T[] }).data)) return (res as { data: T[] }).data;
  if (res && Array.isArray((res as { bookings?: T[] }).bookings)) return (res as { bookings: T[] }).bookings;
  if (res && Array.isArray((res as { payments?: T[] }).payments)) return (res as { payments: T[] }).payments;
  return [];
}
