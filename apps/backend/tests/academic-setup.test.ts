import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessInstitution,
  canListInstitutions,
  buildInstitutionListWhere,
} from "../src/modules/institution/institution.route.js";
import {
  buildAvailableUnitBleIds,
} from "../src/modules/ble/mappings/mapping.service.js";

test("academic setup access control allows super admin and matching institution admin", () => {
  assert.equal(
    canAccessInstitution(
      { user: { role: "SUPER_ADMIN", institutionId: null } },
      "any-inst-id",
    ),
    true,
  );
  assert.equal(
    canAccessInstitution(
      { user: { role: "INSTITUTION_ADMIN", institutionId: "inst-456" } },
      "inst-456",
    ),
    true,
  );
  assert.equal(
    canAccessInstitution(
      { user: { role: "INSTITUTION_ADMIN", institutionId: "inst-456" } },
      "inst-other",
    ),
    false,
  );
});

test("BLE ID allocator finds lowest available unused IDs", () => {
  const used = new Set(["0000", "0001", "0002"]);
  const [nextId] = buildAvailableUnitBleIds(used, 1);
  assert.equal(nextId, "0003");

  const [batch1, batch2] = buildAvailableUnitBleIds(used, 2);
  assert.equal(batch1, "0003");
  assert.equal(batch2, "0004");
});

test("BLE ID allocator fills holes in the sequence when units are deleted", () => {
  // If unit 0001 was deleted, 0001 should be reused first
  const usedWithHole = new Set(["0000", "0002", "0003"]);
  const [reusedId] = buildAvailableUnitBleIds(usedWithHole, 1);
  assert.equal(reusedId, "0001");
});

