// Server-side provider clients share a deadline and never persist responses in
// Next's fetch cache. Keep caller cancellation, including Request-owned signals.
export const PROVIDER_TIMEOUT_MS = 10_000;
export const providerFetch: typeof fetch = (input, init) => {
  const signals = [AbortSignal.timeout(PROVIDER_TIMEOUT_MS)];
  if (input instanceof Request) signals.push(input.signal);
  if (init?.signal) signals.push(init.signal);
  return fetch(input, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.any(signals),
  });
};
