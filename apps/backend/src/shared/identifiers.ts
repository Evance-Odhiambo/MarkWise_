import { normalizeUnitCode } from "./unitCodes.js";

export { normalizeUnitCode } from "./unitCodes.js";

export function cleanIdentifier(value: string | undefined): string {
  return normalizeUnitCode(value);
}
