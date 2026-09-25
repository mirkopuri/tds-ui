export interface EnteredOpts {
  min?: number;
  max?: number;
  locale?: string;
}
/** At least 2 decimals; extra typed decimals (up to 4) shown exactly, never rounded. "" for blank/NaN. */
export function formatEntered(value: number | string | null | undefined, opts?: EnteredOpts): string;
/** Same rule with a currency symbol (Intl); falls back to "<number> <code>". */
export function formatCurrencyEntered(
  value: number | string | null | undefined,
  currency?: string,
  opts?: EnteredOpts
): string;
export const MIN_DECIMALS: number;
export const MAX_DECIMALS: number;
