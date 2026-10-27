"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/domain";
import {
  orderLabels,
  pollingDelay,
  type CustomerOrder,
  type OrderList,
  type OrderDetail,
} from "@/lib/order-domain";
function useOrderPoll<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [status, setStatus] = useState("Loading saved orders..."),
    [checked, setChecked] = useState<string | null>(null),
    [loading, setLoading] = useState(false);
  const refresh = useRef<() => void>(() => {});
  useEffect(() => {
    let active = true,
      stopped = false,
      inFlight = false,
      failures = 0,
      timer: ReturnType<typeof setTimeout> | undefined,
      controller: AbortController | undefined;
    setData(null);
    setChecked(null);
    function clear() {
      if (timer) clearTimeout(timer);
      controller?.abort();
    }
    async function update() {
      if (!active || stopped || inFlight) return;
      if (document.hidden) {
        setStatus("Automatic updates pause while this tab is hidden.");
        return;
      }
      if (!navigator.onLine) {
        setStatus("Offline. Displayed information may be out of date.");
        return;
      }
      inFlight = true;
      controller = new AbortController();
      setLoading(true);
      try {
        const response = await fetch(path, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        if (!active) return;
        if ([401, 403, 404].includes(response.status)) {
          setData(null);
          setChecked(null);
          stopped = true;
          throw new Error(
            "This order is unavailable for your account. Sign in again to continue.",
          );
        }
        const result = await response.json();
        if (!active) return;
        if (!response.ok)
          throw new Error(result.message || "Updates unavailable.");
        setData(result);
        setChecked(new Date().toISOString());
        setStatus("");
        failures = 0;
      } catch (e) {
        if (active && !controller.signal.aborted) {
          failures++;
          setStatus(
            `${e instanceof Error ? e.message : "Updates unavailable."} Displayed information may be out of date.`,
          );
        }
      } finally {
        inFlight = false;
        if (active) {
          setLoading(false);
          if (!stopped && !document.hidden && navigator.onLine)
            timer = setTimeout(() => void update(), pollingDelay(failures));
        }
      }
    }
    function connection() {
      clear();
      if (document.hidden)
        setStatus("Automatic updates pause while this tab is hidden.");
      else if (!navigator.onLine)
        setStatus("Offline. Displayed information may be out of date.");
      else void update();
    }
    refresh.current = () => {
      stopped = false;
      if (timer) clearTimeout(timer);
      void update();
    };
    void update();
    document.addEventListener("visibilitychange", connection);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    return () => {
      active = false;
      refresh.current = () => {};
      clear();
      document.removeEventListener("visibilitychange", connection);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, [path]);
  return {
    data,
    status,
    checked,
    loading,
    retry: () => refresh.current(),
  };
}
function OrderSummary({ order: o }: { order: CustomerOrder }) {
  return (
    <>
      <p>{orderLabels[o.status] ?? "Update unavailable"}</p>
      <p>
        Created {new Date(o.createdAt).toLocaleDateString()}. Last recorded
        change {new Date(o.updatedAt).toLocaleString()}.
      </p>
      <p>
        {o.confirmedTotalPaise === null
          ? `Final total awaits agreement${o.estimatePaise === null ? "" : `; provisional estimate ${money(o.estimatePaise)}`}.`
          : `Agreed total: ${money(o.confirmedTotalPaise)}.`}
      </p>
      <p>
        {o.paymentVerified
          ? `Owner-verified receipt recorded: ${money(o.paymentReceivedPaise)}. ${o.confirmedTotalPaise !== null && o.paymentReceivedPaise < o.confirmedTotalPaise ? "This is a partial payment, not payment in full." : ""}`
          : "No owner-verified payment receipt recorded."}
      </p>
      {o.eta && (
        <p>Estimated delivery date: {o.eta}. Subject to owner confirmation.</p>
      )}
    </>
  );
}
export function OrderTracking({ code }: { code?: string }) {
  const [page, setPage] = useState(1),
    [eventPage, setEventPage] = useState(1);
  const result = useOrderPoll<OrderList | OrderDetail>(
    code
      ? `/api/orders?code=${encodeURIComponent(code)}&eventPage=${eventPage}`
      : `/api/orders?page=${page}`,
  );
  const list = result.data && "orders" in result.data ? result.data : null,
    detail = result.data && "order" in result.data ? result.data : null;
  return (
    <section aria-label={code ? "Your order timeline" : "Your saved orders"}>
      <p role="status">{result.status}</p>
      {result.checked && (
        <p className="quiet-note">
          Last checked {new Date(result.checked).toLocaleTimeString()}. Checks
          do not mean the order changed.
        </p>
      )}
      <button
        className="button secondary"
        type="button"
        disabled={result.loading}
        onClick={result.retry}
      >
        Check for updates
      </button>
      {list && (
        <>
          {list.orders.length === 0 && (
            <p>
              No enquiries or orders are linked to this account yet. Signing in
              does not claim a guest enquiry by matching contact details.
            </p>
          )}
          {list.orders.map((o) => (
            <article className="notice" key={o.code}>
              <h2>
                <Link
                  className="underline"
                  href={`/orders/${encodeURIComponent(o.code)}`}
                >
                  {o.code}
                </Link>
              </h2>
              <OrderSummary order={o} />
            </article>
          ))}
          <button
            className="button secondary"
            type="button"
            disabled={page === 1 || result.loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous orders
          </button>
          <button
            className="button secondary"
            type="button"
            disabled={!list.hasMore || result.loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next orders
          </button>
        </>
      )}
      {detail && (
        <>
          <h2>{detail.order.code}</h2>
          <OrderSummary order={detail.order} />
          <h3>Saved gift details</h3>
          {detail.items.map((i) => (
            <article key={i.id}>
              <h4>{i.name}</h4>
              <p>
                Quantity {i.quantity}
                {i.unitPricePaise === null
                  ? "; item price requires quotation"
                  : `; saved unit price ${money(i.unitPricePaise)}`}
                . Saved item prices may differ from the final agreed custom
                quotation.
              </p>
              {i.options.map((o) => (
                <p key={o.label}>{o.label}</p>
              ))}
              <p>{i.message}</p>
            </article>
          ))}
          {detail.hasMoreItems && (
            <p>
              Additional items are retained with this enquiry. Contact the owner
              for the full item list.
            </p>
          )}
          <h3>{eventPage === 1 ? "Latest timeline" : "Earlier timeline"}</h3>
          <ol>
            {detail.events.map((e) => (
              <li key={e.version}>
                <strong>{orderLabels[e.status] ?? "Order update"}</strong>
                <p>
                  <time dateTime={e.at}>{new Date(e.at).toLocaleString()}</time>
                </p>
                {e.note && <p>{e.note}</p>}
              </li>
            ))}
          </ol>
          {detail.events.length === 0 && (
            <p>No customer-visible timeline events yet.</p>
          )}
          <button
            className="button secondary"
            type="button"
            disabled={eventPage === 1 || result.loading}
            onClick={() => setEventPage((p) => p - 1)}
          >
            Newer events
          </button>
          <button
            className="button secondary"
            type="button"
            disabled={!detail.hasOlderEvents || result.loading}
            onClick={() => setEventPage((p) => p + 1)}
          >
            Older events
          </button>
          <p>
            <Link className="underline" href="/orders">
              All your orders
            </Link>
          </p>
        </>
      )}
      <p>
        Updates are recorded by the owner. This website does not process
        payments or automatically confirm delivery.
      </p>
    </section>
  );
}
