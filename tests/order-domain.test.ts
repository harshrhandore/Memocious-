import { test } from "node:test";
import assert from "node:assert/strict";
import {
  orderCode,
  orderQuery,
  pollingDelay,
  orderLabels,
} from "../src/lib/order-domain";
test("order query accepts randomized reference formats, bounds pages and rejects authority injection", () => {
  assert.equal(
    orderCode.safeParse("CUS-2610-000001-0123456789AB").success,
    true,
  );
  assert.equal(orderCode.safeParse("GFT-2610-000001").success, false);
  for (const q of [
    { page: 0 },
    { page: 10001 },
    { eventPage: -1 },
    { userId: "another-owner" },
  ])
    assert.equal(orderQuery.safeParse(q).success, false);
  assert.deepEqual(orderQuery.parse({}), { page: 1, eventPage: 1 });
});
test("order polling starts around thirty seconds and bounds retry backoff", () => {
  assert.equal(pollingDelay(0), 30000);
  assert.equal(pollingDelay(1), 60000);
  assert.equal(pollingDelay(99), 300000);
  assert.equal(orderLabels.payment_received, "Payment recorded");
});
