import assert from "node:assert/strict";
import test from "node:test";

import { inspectIntegrations } from "@songforge/integrations";

import { buildHealthReport } from "./health-report.ts";

test("health never claims a provider is connected without configuration", async () => {
  const previousEleven = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  const body = await buildHealthReport();
  assert.equal(body.product, "songforge-os");
  const eleven = body.integrations.find((item) => item.id === "elevenlabs");
  assert.ok(eleven);
  assert.notEqual(eleven.status, "CONNECTED");
  if (previousEleven) process.env.ELEVENLABS_API_KEY = previousEleven;
});

test("integrations endpoint reports fail-closed statuses", () => {
  const integrations = inspectIntegrations();
  assert.ok(integrations.some((item) => item.id === "dsp"));
  const dsp = integrations.find((item) => item.id === "dsp");
  assert.ok(dsp);
  assert.notEqual(dsp.status, "CONNECTED");
});
