export function cleanIdentifier(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, "").toUpperCase() ?? "";
}
