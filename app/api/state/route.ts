import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { accountingStates } from "../../../db/schema";
import { attachSessionCookie, getOrCreateSession } from "../../request-session";

export async function GET(request: Request) {
  const session = getOrCreateSession(request);
  try {
    const [record] = await getDb().select().from(accountingStates).where(eq(accountingStates.userId, session.id)).limit(1);
    const response = Response.json({ state: record ? JSON.parse(record.stateJson) : null });
    return session.isNew ? attachSessionCookie(response, request, session.id) : response;
  } catch (error) {
    console.error("state_get_failed", error);
    return Response.json({ error: "Data cloud belum dapat dimuat." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = getOrCreateSession(request);
  try {
    const payload = (await request.json()) as { state?: unknown };
    if (!payload.state || typeof payload.state !== "object") return Response.json({ error: "Data tidak valid." }, { status: 400 });
    const stateJson = JSON.stringify(payload.state);
    if (stateJson.length > 2_000_000) return Response.json({ error: "Ukuran data melebihi batas." }, { status: 413 });
    const updatedAt = new Date().toISOString();
    await getDb().insert(accountingStates).values({ userId: session.id, stateJson, updatedAt })
      .onConflictDoUpdate({ target: accountingStates.userId, set: { stateJson, updatedAt } });
    const response = Response.json({ saved: true, updatedAt });
    return session.isNew ? attachSessionCookie(response, request, session.id) : response;
  } catch (error) {
    console.error("state_save_failed", error);
    return Response.json({ error: "Data cloud belum dapat disimpan." }, { status: 500 });
  }
}
