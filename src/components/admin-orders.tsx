"use client";
import { useEffect, useState } from "react";
import { privateRequest, RequestError } from "@/lib/client-request";
import { money } from "@/lib/domain";
import { orderLabels } from "@/lib/order-domain";
import {
  ownerOrderMutation,
  ownerTransitions,
  orderNotification,
  orderStates,
  type OwnerOrder,
  type OwnerOrderDetail,
} from "@/lib/owner-order-domain";

function OrderAction({
  order,
  onRecorded,
  onDenied,
  onLock,
}: {
  order: OwnerOrder;
  onRecorded: () => void;
  onDenied: () => void;
  onLock: (locked: boolean) => void;
}) {
  const targets = ownerTransitions(order);
  const receiptAllowed =
    !["inquiry", "cancelled", "refunded"].includes(order.status) &&
    order.confirmedTotalPaise !== null &&
    order.paymentReceivedPaise < order.confirmedTotalPaise;
  const refundAllowed =
    ["cancelled", "delivered"].includes(order.status) &&
    order.paymentReceivedPaise > (order.refundRecordedPaise ?? 0);
  const [action, setAction] = useState(
      targets.length ? "transition" : refundAllowed ? "refund" : "transition",
    ),
    [target, setTarget] = useState(targets[0] ?? ""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState<unknown>(null),
    [conflict, setConflict] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  return (
    <form
      aria-label="Record order action"
      onSubmit={async (event) => {
        event.preventDefault();
        const f = new FormData(event.currentTarget);
        let body = pending;
        if (!body) {
          const notes = {
            reason: String(f.get("reason") ?? ""),
            customerNote: String(f.get("customerNote") ?? ""),
          };
          const fields =
            action === "transition"
              ? {
                  ...notes,
                  status: target,
                  ...(order.status === "inquiry" && target === "confirmed"
                    ? {
                        agreedTotalPaise: Number(f.get("total")),
                        contactName: String(f.get("contactName") ?? ""),
                        phone: String(f.get("phone") ?? ""),
                      }
                    : {}),
                  ...(order.status === "payment_received" &&
                  ["quality_check", "packed"].includes(target)
                    ? { readyMadeVerified: f.get("ready") === "on" }
                    : {}),
                }
              : {
                  ...notes,
                  amountPaise: Number(f.get("amount")),
                  date: String(f.get("date") ?? ""),
                  reference: String(f.get("reference") ?? ""),
                };
          const parsed = ownerOrderMutation.safeParse({
            id: order.id,
            version: order.version,
            requestKey: crypto.randomUUID(),
            action,
            fields,
          });
          if (!parsed.success) {
            setMessage(
              "Check the required details. Amounts are whole paise; phone includes country code.",
            );
            return;
          }
          body = parsed.data;
        }
        setBusy(true);
        setMessage("");
        setPending(body);
        onLock(true);
        try {
          await privateRequest("/api/admin/orders", body);
          setPending(null);
          onLock(false);
          onRecorded();
        } catch (error) {
          if (
            error instanceof RequestError &&
            error.status < 500 &&
            error.status !== 429
          ) {
            setPending(null);
            onLock(false);
            if ([401, 403].includes(error.status)) onDenied();
            if (error.status === 409) setConflict(true);
            setMessage(
              error.message +
                (error.status === 409
                  ? " Refresh the saved record before another action."
                  : ""),
            );
          } else {
            setMessage(
              "The outcome is uncertain. Retry this same action to reconcile it before changing details. Do not create another payment record.",
            );
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Every action requires owner verification within five minutes. Record
        actual offline facts; this website does not collect or refund money.
      </p>
      <fieldset disabled={busy || pending !== null || conflict}>
        <div className="form-field">
          <label htmlFor="order-action">Action</label>
          <select
            id="order-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="transition" disabled={!targets.length}>
              Change status
            </option>
            <option value="receipt" disabled={!receiptAllowed}>
              Record verified receipt
            </option>
            <option value="refund" disabled={!refundAllowed}>
              Record verified refund
            </option>
          </select>
        </div>
        {action === "transition" ? (
          <>
            <div className="form-field">
              <label htmlFor="order-target">Next status</label>
              <select
                id="order-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
              >
                <option value="" disabled>
                  Choose status
                </option>
                {targets.map((s) => (
                  <option key={s} value={s}>
                    {orderLabels[s]}
                  </option>
                ))}
              </select>
            </div>
            {order.status === "inquiry" && target === "confirmed" && (
              <>
                <div className="form-field">
                  <label htmlFor="order-total">
                    Agreed total in paise (0 is genuine zero)
                  </label>
                  <input
                    id="order-total"
                    name="total"
                    type="number"
                    min="0"
                    max="1000000000000"
                    step="1"
                    defaultValue={order.confirmedTotalPaise ?? ""}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="order-contact">
                    Agreed customer contact name
                  </label>
                  <input
                    id="order-contact"
                    name="contactName"
                    maxLength={120}
                    defaultValue={order.contactName ?? ""}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="order-phone">
                    Customer phone with country code
                  </label>
                  <input
                    id="order-phone"
                    name="phone"
                    type="tel"
                    maxLength={20}
                    defaultValue={order.phone ?? ""}
                    required
                  />
                </div>
              </>
            )}
            {order.status === "payment_received" &&
              ["quality_check", "packed"].includes(target) && (
                <label className="check-label">
                  <input name="ready" type="checkbox" required /> I verified
                  this is ready-made and the reason documents why production is
                  skipped.
                </label>
              )}
            {order.status === "packed" && (
              <p>
                Dispatch remains unavailable until courier/local-delivery
                evidence fields are implemented.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="form-field">
              <label htmlFor="order-amount">Actual amount in paise</label>
              <input
                id="order-amount"
                name="amount"
                type="number"
                min="1"
                max="1000000000000"
                step="1"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="order-date">Receipt/refund date (India)</label>
              <input id="order-date" name="date" type="date" required />
            </div>
            <div className="form-field">
              <label htmlFor="order-reference">
                Private receipt/refund reference
              </label>
              <input
                id="order-reference"
                name="reference"
                maxLength={120}
                required
              />
            </div>
          </>
        )}
        <div className="form-field">
          <label htmlFor="order-reason">
            Internal reason / verification evidence
          </label>
          <textarea id="order-reason" name="reason" maxLength={2000} required />
        </div>
        <div className="form-field">
          <label htmlFor="order-note">Customer-visible note (optional)</label>
          <textarea id="order-note" name="customerNote" maxLength={2000} />
        </div>
      </fieldset>
      <button
        className="button"
        type="submit"
        disabled={
          busy || conflict || (!pending && action === "transition" && !target)
        }
      >
        {busy
          ? "Recording..."
          : pending
            ? "Retry same action"
            : "Record verified action"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}

export function AdminOrders() {
  const [code, setCode] = useState<string | null>(null),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [eventPage, setEventPage] = useState(1),
    [revision, setRevision] = useState(0),
    [data, setData] = useState<
      { orders: OwnerOrder[]; hasMore: boolean } | OwnerOrderDetail | null
    >(null),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [locked, setLocked] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision deliberately refreshes an unchanged query after a recorded action or manual retry.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage("");
    const query = new URLSearchParams(
      code
        ? { code, eventPage: String(eventPage) }
        : { page: String(page), status },
    );
    privateRequest<typeof data>(`/api/admin/orders?${query}`)
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) {
          setData(null);
          setMessage(
            e instanceof Error ? e.message : "Saved orders are unavailable.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code, status, page, eventPage, revision]);
  const detail = data && "order" in data ? data : null,
    list = data && "orders" in data ? data : null;
  const notification = detail && orderNotification(detail.order);
  function open(next: string | null) {
    setData(null);
    setCode(next);
    setEventPage(1);
    setRevision((r) => r + 1);
  }
  return (
    <section aria-label="Owner order management">
      <h2>Orders and offline records</h2>
      <p>
        Saved enquiries are not confirmed sales. Records update only after
        acknowledged owner actions. No automatic messages are sent.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = String(new FormData(e.currentTarget).get("code") ?? "")
            .trim()
            .toUpperCase();
          open(value || null);
        }}
      >
        <div className="form-field">
          <label htmlFor="owner-code">Exact enquiry/order code</label>
          <input
            id="owner-code"
            name="code"
            maxLength={40}
            disabled={locked || loading}
          />
        </div>
        <button
          type="submit"
          className="button secondary"
          disabled={locked || loading}
        >
          Find saved record
        </button>
      </form>
      <button
        type="button"
        className="button secondary"
        disabled={locked || loading}
        onClick={() => {
          setData(null);
          setRevision((r) => r + 1);
        }}
      >
        Refresh saved records
      </button>
      <p role="status">{loading ? "Loading saved records..." : message}</p>
      {list && (
        <>
          <div className="form-field">
            <label htmlFor="owner-status">Filter status</label>
            <select
              id="owner-status"
              value={status}
              disabled={locked || loading}
              onChange={(e) => {
                setData(null);
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {orderStates.options.map((s) => (
                <option key={s} value={s}>
                  {orderLabels[s]}
                </option>
              ))}
            </select>
          </div>
          {list.orders.length === 0 && <p>No saved orders match this view.</p>}
          {list.orders.map((o) => (
            <article key={o.id} className="notice">
              <h3>{o.code}</h3>
              <p>
                {orderLabels[o.status]} ·{" "}
                {o.contactName || "Contact not recorded"}
              </p>
              <button
                type="button"
                className="button secondary"
                disabled={locked || loading}
                onClick={() => open(o.code)}
              >
                Manage {o.code}
              </button>
            </article>
          ))}
          <button
            type="button"
            className="button secondary"
            disabled={page === 1 || loading}
            onClick={() => {
              setData(null);
              setPage((p) => p - 1);
            }}
          >
            Previous orders
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={!list.hasMore || loading}
            onClick={() => {
              setData(null);
              setPage((p) => p + 1);
            }}
          >
            Next orders
          </button>
        </>
      )}
      {detail && (
        <>
          <h3>{detail.order.code}</h3>
          <p>
            {orderLabels[detail.order.status]} · revision {detail.order.version}
          </p>
          <p>
            Agreed total:{" "}
            {detail.order.confirmedTotalPaise === null
              ? "Not agreed"
              : money(detail.order.confirmedTotalPaise)}
            . Recorded receipts: {money(detail.order.paymentReceivedPaise)}.
            Recorded refunds: {money(detail.order.refundRecordedPaise ?? 0)}.
          </p>
          {detail.order.confirmedTotalPaise !== null &&
            detail.order.paymentReceivedPaise > 0 &&
            detail.order.paymentReceivedPaise <
              detail.order.confirmedTotalPaise && (
              <p>This is a partial payment, not payment in full.</p>
            )}
          {detail.order.refundDue && (
            <p className="notice">
              Refund remains due. Cancellation did not return money.
            </p>
          )}
          {notification ? (
            <>
              <a
                className="button secondary"
                href={notification}
                target="_blank"
                rel="noreferrer"
              >
                Notify on WhatsApp
              </a>
              <p>
                You must press Send in WhatsApp. Opening this link records no
                delivery or payment.
              </p>
            </>
          ) : (
            <p>No valid customer WhatsApp destination is recorded.</p>
          )}
          {detail.items.map((i) => (
            <p key={i.id}>
              {i.name} · quantity {i.quantity} · {i.message}
            </p>
          ))}
          {detail.hasMoreItems && (
            <p>
              Only the first 100 items are shown; remaining items are retained.
            </p>
          )}
          <OrderAction
            key={`${detail.order.id}-${detail.order.version}`}
            order={detail.order}
            onLock={setLocked}
            onDenied={() => {
              setData(null);
              setMessage(
                "Current owner verification is required. Verify your authenticator in Security, then refresh saved records.",
              );
            }}
            onRecorded={() => {
              setData(null);
              setRevision((r) => r + 1);
            }}
          />
          <h4>Recorded history</h4>
          {detail.events.map((e) => (
            <article className="notice" key={e.version}>
              <p>
                Revision {e.version}: {orderLabels[e.status]} · {e.at}
              </p>
              <p>Customer note: {e.note || "None"}</p>
              <p>Internal reason: {e.internalNote || "None"}</p>
            </article>
          ))}
          <h4>Verified offline receipt/refund records</h4>
          {detail.moneyRecords.length === 0 && (
            <p>No money records on this page.</p>
          )}
          {detail.moneyRecords.map((m) => (
            <p key={m.id}>
              {m.kind}: {money(m.amountPaise)} · {m.date} · {m.reference} ·{" "}
              {m.reason}
            </p>
          ))}
          <button
            type="button"
            className="button secondary"
            disabled={locked || loading || eventPage === 1}
            onClick={() => {
              setData(null);
              setEventPage((p) => p - 1);
            }}
          >
            Newer history
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={
              locked ||
              loading ||
              !(detail.hasOlderEvents || detail.hasOlderMoneyRecords)
            }
            onClick={() => {
              setData(null);
              setEventPage((p) => p + 1);
            }}
          >
            Older history
          </button>
        </>
      )}
      {code && (
        <button
          type="button"
          className="button secondary"
          disabled={locked || loading}
          onClick={() => open(null)}
        >
          Back to order list
        </button>
      )}
    </section>
  );
}
