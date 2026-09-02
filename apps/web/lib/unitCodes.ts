/** Stable comparison key for unit codes. Display values should remain separate. */
export const normalizeUnitCode = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');

export const unitCodesEqual = (left: unknown, right: unknown): boolean => {
  const a = normalizeUnitCode(left);
  const b = normalizeUnitCode(right);
  return Boolean(a && b && a === b);
};
