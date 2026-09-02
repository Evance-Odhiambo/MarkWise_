import type { PrismaClient } from "../generated/prisma/client.js";
import { normalizeUnitCode } from "./unitCodes.js";

export type ResolvedUnit = {
  id: string;
  code: string;
  name: string;
  bleId: string | null;
};

/**
 * Resolves a Unit by code within an institution. Unit.code preserves its
 * original formatting as entered at setup time (e.g. "SBT 2170", with a
 * space) - but several call sites only ever have a normalizeUnitCode()'d
 * version of a code (a cache key, a manually-stripped request param, a
 * value copied from somewhere that already stripped it), which can never
 * exact-match the canonical stored code. Try an exact match first (works
 * whenever the caller already has the canonical code - the common case,
 * since most callers get it straight from a Unit row), then fall back to
 * comparing normalized forms across the institution's units so a
 * stripped/differently-punctuated code still resolves.
 */
export async function resolveUnitByCode(
  prisma: PrismaClient,
  code: string,
  institutionId: string,
): Promise<ResolvedUnit | null> {
  const exact = await prisma.unit.findFirst({
    where: { code, institutionId },
    select: { id: true, code: true, name: true, bleId: true },
  });
  if (exact) return exact;

  const normalized = normalizeUnitCode(code);
  if (!normalized) return null;
  const units = await prisma.unit.findMany({
    where: { institutionId },
    select: { id: true, code: true, name: true, bleId: true },
  });
  return units.find((u) => normalizeUnitCode(u.code) === normalized) ?? null;
}

/**
 * Batch version - resolves unit names for many codes at once (e.g.
 * enriching a list response) without an exact `code: {in: codes}}` filter,
 * which has the same stripped-code blind spot as the single-code version.
 */
export async function resolveUnitNamesByCodes(
  prisma: PrismaClient,
  codes: string[],
  institutionId: string,
): Promise<Map<string, string>> {
  if (codes.length === 0) return new Map();
  const units = await prisma.unit.findMany({
    where: { institutionId },
    select: { code: true, name: true },
  });
  const byNormalized = new Map(units.map((u) => [normalizeUnitCode(u.code), u.name]));
  const result = new Map<string, string>();
  for (const code of codes) {
    const name = byNormalized.get(normalizeUnitCode(code));
    if (name !== undefined) result.set(code, name);
  }
  return result;
}
