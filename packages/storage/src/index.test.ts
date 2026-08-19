import assert from "node:assert/strict";
import test from "node:test";

import { contentHash, storageHealth } from "./index.ts";

test("storage is UNCONFIGURED without endpoint", () => {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  delete process.env.S3_ENDPOINT;
  delete process.env.S3_BUCKET;
  assert.equal(storageHealth(), "UNCONFIGURED");
  if (endpoint) process.env.S3_ENDPOINT = endpoint;
  if (bucket) process.env.S3_BUCKET = bucket;
});

test("content hashes are stable", () => {
  assert.equal(contentHash("master"), contentHash("master"));
});
