import assert from "node:assert/strict";
import test from "node:test";

import { canAccessInstitution, canListInstitutions, buildInstitutionListWhere } from "../src/modules/institution/institution.route.js";

test("super admin can list all institutions", () => {
  assert.equal(canListInstitutions({ role: "SUPER_ADMIN", institutionId: null }), true);
  assert.deepEqual(buildInstitutionListWhere({ role: "SUPER_ADMIN", institutionId: null }), {});
});

test("institution admin can only list their own institution", () => {
  assert.equal(canListInstitutions({ role: "INSTITUTION_ADMIN", institutionId: "inst-123" }), true);
  assert.deepEqual(buildInstitutionListWhere({ role: "INSTITUTION_ADMIN", institutionId: "inst-123" }), { id: "inst-123" });
  assert.equal(canAccessInstitution({ user: { role: "INSTITUTION_ADMIN", institutionId: "inst-123" } }, "inst-123"), true);
  assert.equal(canAccessInstitution({ user: { role: "INSTITUTION_ADMIN", institutionId: "inst-123" } }, "other-inst"), false);
});

test("non-admin users cannot list institutions", () => {
  assert.equal(canListInstitutions({ role: "student", institutionId: "inst-123" }), false);
  assert.deepEqual(buildInstitutionListWhere({ role: "student", institutionId: "inst-123" }), { id: "__no_institution__" });
});
