import "server-only";
import { supabaseSecretKey } from "./config";
import { HttpError } from "./security";
import { createClient } from "@supabase/supabase-js";
import { providerFetch } from "./provider-fetch";
export function serverDb() {
  if (!process.env.SUPABASE_URL || !supabaseSecretKey)
    throw new Error("Service unavailable");
  return createClient(process.env.SUPABASE_URL, supabaseSecretKey, {
    global: { fetch: providerFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export async function rpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await serverDb().rpc(name, args);
  if (error) {
    const status =
      error.code === "54000"
        ? 429
        : error.code === "40001" || error.code === "23505"
          ? 409
          : error.code === "28000"
            ? 401
            : error.code === "42501"
              ? 403
              : ["22023", "23514", "23502", "22P02"].includes(error.code)
                ? 422
                : 503;
    const message =
      status === 429
        ? "Upload quota reached. Please wait before trying again."
        : status === 409
          ? "Details changed. Refresh and try again."
          : status === 401
            ? "Please sign in again."
            : status === 403
              ? "This action requires current administrator verification."
              : status === 422
                ? "Check the details and try again."
                : "Temporarily unavailable. Please try again shortly.";
    throw new HttpError(status, message);
  }
  return data as T;
}
