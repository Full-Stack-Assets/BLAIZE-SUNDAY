import test from "node:test";
import assert from "node:assert/strict";
import { apiError } from "./api.ts";

for (const code of [
  "EXTERNAL_TASK_RECEIPT_REQUIRED",
  "EXTERNAL_TASK_RECEIPT_IMMUTABLE",
  "EXTERNAL_RESULT_RECEIPT_IMMUTABLE",
  "EXTERNAL_TASK_RECEIPT_CONFLICT",
  "VIDEO_VERSION_CONFLICT",
  "QC_NOT_READY"
]) {
  test(`${code} maps to HTTP 409`, () => {
    assert.equal(apiError(new Error(code)).status, 409);
  });
}

test("video run not found remains HTTP 404", () => {
  assert.equal(apiError(new Error("VIDEO_RUN_NOT_FOUND")).status, 404);
});
