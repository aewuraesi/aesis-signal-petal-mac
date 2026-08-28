import { eq } from "drizzle-orm";
import { ensureStateSchema } from "../../../db";
import { stateTable } from "../../../db/schema";

const CHATGPT_USER_HEADER = "oai-authenticated-user-id";

// Identity: on the real hosting platform the control plane injects the ChatGPT
// user id as a header, so every device belonging to one person shares one store.
// In local dev those headers are absent, so we fall back to a per-browser device id
// the client sends — still durable across reloads, just not across devices.
function resolveUserId(request: Request): string {
  const chatgptId = request.headers.get(CHATGPT_USER_HEADER);
  if (chatgptId) return chatgptId;
  const deviceId = request.headers.get("x-device-id");
  if (deviceId) return `device:${deviceId}`;
  return "local";
}

export async function GET(request: Request) {
  try {
    const db = await ensureStateSchema();
    const userId = resolveUserId(request);
    const row = await db.select().from(stateTable).where(eq(stateTable.userId, userId)).get();
    return Response.json(row ? { data: row.data, updatedAt: row.updatedAt } : { data: null, updatedAt: 0 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = await ensureStateSchema();
    const payload = (await request.json()) as { data?: string; updatedAt?: number };
    const data = payload.data ?? "";
    const updatedAt = Number(payload.updatedAt) || Date.now();
    const userId = resolveUserId(request);
    await db
      .insert(stateTable)
      .values({ userId, data, updatedAt })
      .onConflictDoUpdate({ target: stateTable.userId, set: { data, updatedAt } });
    return Response.json({ ok: true, updatedAt });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
