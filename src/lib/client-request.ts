export async function privateRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    const session = await fetch("/api/session", { cache: "no-store" });
    const data = await session.json();
    if (!session.ok || !data.csrf)
      throw new Error("Please reload and try again.");
    headers["X-CSRF-Token"] = data.csrf;
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    cache: "no-store",
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Please try again.");
  return data as T;
}
