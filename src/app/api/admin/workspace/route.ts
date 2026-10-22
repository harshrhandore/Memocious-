import type { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/session";
import { safeJson, failure, HttpError } from "@/lib/security";
import { rpc } from "@/lib/server-db";
export async function GET(req: NextRequest) {
  try {
    const s = await requireAdminSession();
    const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 10000)
      throw new HttpError(422, "Check the page number.");
    return safeJson(
      await rpc("memocious_admin_workspace", { sid: s.id, page_num: page }),
    );
  } catch (e) {
    return failure(e);
  }
}
