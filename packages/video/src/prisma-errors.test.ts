import test from "node:test";
import assert from "node:assert/strict";
import { translatePrismaVideoError } from "./prisma-repository.ts";

function p2002(target: string[]) {
  return { code: "P2002", meta: { target } };
}

test("Prisma external task uniqueness maps to a stable receipt conflict", () => {
  assert.equal(
    translatePrismaVideoError(p2002(["externalTaskId"])).message,
    "EXTERNAL_TASK_RECEIPT_CONFLICT"
  );
});

test("Prisma lineage version uniqueness maps to a video version conflict", () => {
  assert.equal(
    translatePrismaVideoError(p2002(["lineageKey", "version"])).message,
    "VIDEO_VERSION_CONFLICT"
  );
});

test("Prisma caption version uniqueness maps to caption conflict", () => {
  assert.equal(
    translatePrismaVideoError(p2002(["runId", "version", "format"])).message,
    "CAPTION_VERSION_ALREADY_EXISTS"
  );
});

test("non-Prisma errors keep their original identity", () => {
  const original = new Error("DATABASE_OFFLINE");
  assert.equal(translatePrismaVideoError(original), original);
});
