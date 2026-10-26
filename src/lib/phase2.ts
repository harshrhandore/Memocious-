import "server-only";
import { phase2Ready } from "./config";
import { HttpError } from "./security";
export function requirePhase2() {
  if (!phase2Ready) throw new HttpError(503, "This feature is being set up.");
}
