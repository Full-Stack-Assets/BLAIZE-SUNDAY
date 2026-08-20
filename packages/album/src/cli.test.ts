import assert from "node:assert/strict";
import test from "node:test";
import { parseCli } from "./cli.ts";

test("audit requires an explicit source map", () => {
  assert.throws(() => parseCli(["audit"]), /--source-map/);
});

test("render requires a profile", () => {
  assert.throws(() => parseCli(["render", "--track", "01_LOOKS_EXPENSIVE"]), /--profile/);
});

test("bootstrap requires an output directory", () => {
  assert.throws(() => parseCli(["bootstrap"]), /--output/);
});
