import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashFile, writeChecksumFile, writeProvenanceReceipt } from "./provenance.ts";

test("hashFile returns stable SHA-256 for source evidence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "album-prov-"));
  const file = join(dir, "source.bin");
  await writeFile(file, "blaize");
  assert.match(await hashFile(file), /^[a-f0-9]{64}$/);
  assert.equal(await hashFile(file), await hashFile(file));
});

test("checksum and provenance receipts serialize deterministically", async () => {
  const dir = await mkdtemp(join(tmpdir(), "album-prov-"));
  const checksumPath = join(dir, "checksums.sha256");
  await writeChecksumFile(
    [
      { filename: "b.wav", sha256: "b".repeat(64) },
      { filename: "a.wav", sha256: "a".repeat(64) }
    ],
    checksumPath
  );
  const checksum = await readFile(checksumPath, "utf8");
  assert.ok(checksum.startsWith(`${"a".repeat(64)}  a.wav`));

  const receiptPath = join(dir, "provenance.json");
  await writeProvenanceReceipt({ z: 1, a: { d: 4, c: 3 } }, receiptPath);
  assert.equal(
    await readFile(receiptPath, "utf8"),
    '{\n  "a": {\n    "c": 3,\n    "d": 4\n  },\n  "z": 1\n}\n'
  );
});
