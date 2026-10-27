import test from "node:test";
import assert from "node:assert/strict";
import {
  ownerOrderMutation,
  ownerOrderQuery,
  ownerTransitions,
  orderNotification,
  type OwnerOrder,
} from "../src/lib/owner-order-domain";
const order: OwnerOrder = {
  id: crypto.randomUUID(),
  code: "GFT-2610-000001-0123456789AB",
  version: 1,
  source: "product",
  status: "inquiry",
  createdAt: "2026-10-27",
  updatedAt: "2026-10-27",
  estimatePaise: null,
  confirmedTotalPaise: null,
  paymentReceivedPaise: 0,
  paymentVerified: false,
  refundRecordedPaise: 0,
  eta: null,
  contactName: "PRIVATE NAME",
  phone: "12025550123",
  holdFrom: null,
  refundDue: false,
};
test("owner mutations distinguish agreed zero from actual positive money facts and reject authority injection", () => {
  const base = { id: order.id, version: 1, requestKey: crypto.randomUUID() };
  const confirm = {
    ...base,
    action: "transition",
    fields: {
      status: "confirmed",
      reason: "Agreed",
      customerNote: "",
      agreedTotalPaise: 0,
      contactName: "Fixture",
      phone: "+1 202 555 0123",
    },
  };
  const result = ownerOrderMutation.parse(confirm);
  assert.equal(result.action, "transition");
  if (result.action !== "transition") throw new Error("Expected transition");
  assert.equal(result.fields.phone, "12025550123");
  for (const patch of [
    { amountPaise: 0 },
    { amountPaise: -1 },
    { amountPaise: 1.1 },
    { amountPaise: 1e12 + 1 },
    { date: "invalid" },
    { reference: "" },
  ]) {
    assert.equal(
      ownerOrderMutation.safeParse({
        ...base,
        action: "receipt",
        fields: {
          amountPaise: 10,
          date: "2026-10-27",
          reference: "fixture",
          reason: "Verified",
          customerNote: "",
          ...patch,
        },
      }).success,
      false,
    );
  }
  assert.equal(
    ownerOrderMutation.safeParse({ ...confirm, userId: crypto.randomUUID() })
      .success,
    false,
  );
  assert.equal(
    ownerOrderMutation.safeParse({
      ...confirm,
      fields: { ...confirm.fields, paymentVerified: true },
    }).success,
    false,
  );
  assert.equal(
    ownerOrderMutation.safeParse({
      ...confirm,
      fields: { ...confirm.fields, phone: "123" },
    }).success,
    false,
  );
  assert.equal(ownerOrderQuery.safeParse({ page: 10001 }).success, false);
  assert.equal(
    ownerOrderQuery.safeParse({ status: "fake", role: "owner" }).success,
    false,
  );
});
test("owner choices retain hold state, withhold dispatch and keep refunded terminal", () => {
  assert.deepEqual(
    ownerTransitions({
      ...order,
      status: "on_hold",
      holdFrom: "quality_check",
    }),
    ["quality_check", "cancelled"],
  );
  assert.deepEqual(ownerTransitions({ ...order, status: "refunded" }), []);
  assert.deepEqual(
    ownerTransitions({
      ...order,
      status: "cancelled",
      paymentReceivedPaise: 100,
    }),
    [],
  );
  assert.ok(
    !ownerTransitions({ ...order, status: "packed" }).includes("shipped"),
  );
  assert.ok(
    ownerTransitions({
      ...order,
      status: "confirmed",
      confirmedTotalPaise: 0,
    }).includes("in_production"),
  );
});
test("manual order notification contains minimal code/status and validates the destination", () => {
  const link = orderNotification(order)!;
  const text = new URL(link).searchParams.get("text")!;
  assert.ok(text.includes(order.code));
  assert.ok(!text.includes("PRIVATE"));
  assert.equal(new URL(link).pathname, "/12025550123");
  assert.equal(orderNotification({ ...order, phone: "123" }), null);
  assert.equal(orderNotification({ ...order, code: "PRIVATE TOKEN" }), null);
});
