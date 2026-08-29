export function cleanIdentifier(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}
