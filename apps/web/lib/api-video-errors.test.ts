import test from "node:test";
import assert from "node:assert/strict";
import { apiStatusForCode } from "./api-error-status.ts";

for (const code of [
  "EXTERNAL_TASK_RECEIPT_REQUIRED",
  "EXTERNAL_TASK_RECEIPT_IMMUTABLE",
  "EXTERNAL_RESULT_RECEIPT_IMMUTABLE",
  "EXTERNAL_TASK_RECEIPT_CONFLICT",
  "VIDEO_VERSION_CONFLICT",
  "QC_NOT_READY"
]) {
  test(`${code} maps to HTTP 409`, () => {
    assert.equal(apiStatusForCode(code), 409);
  });
}

test("video run not found remains HTTP 404", () => {
  assert.equal(apiStatusForCode("VIDEO_RUN_NOT_FOUND"), 404);
});
