import "server-only";
import { phase3Ready } from "./config";
import { HttpError } from "./security";
export function requireBuilder() {
  if (!phase3Ready)
    throw new HttpError(503, "The custom gift builder is being set up.");
}
