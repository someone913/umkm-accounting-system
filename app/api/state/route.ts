import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { accountingStates } from "../../../db/schema";

function identity(request: Request) {
  return {
    id: request.headers.get("oai-authenticated-user-id"),
    email: request.headers.get("oai-authenticated-user-email"),
  };
}

export async function GET(request: Request) {
  const user = identity(request);
  if (!user.id) return Response.json({ error: "Sesi pengguna tidak ditemukan." }, { status: 401 });
  try {
    const [record] = await getDb().select().from(accountingStates).where(eq(accountingStates.userId, user.id)).limit(1);
    return Response.json({ state: record ? JSON.parse(record.stateJson) : null, user: { email: user.email } });
  } catch (error) {
    console.error("state_get_failed", error);
    return Response.json({ error: "Data cloud belum dapat dimuat." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = identity(request);
  if (!user.id) return Response.json({ error: "Sesi pengguna tidak ditemukan." }, { status: 401 });
  try {
    const payload = (await request.json()) as { state?: unknown };
    if (!payload.state || typeof payload.state !== "object") return Response.json({ error: "Data tidak valid." }, { status: 400 });
    const stateJson = JSON.stringify(payload.state);
    if (stateJson.length > 2_000_000) return Response.json({ error: "Ukuran data melebihi batas." }, { status: 413 });
    const updatedAt = new Date().toISOString();
    await getDb().insert(accountingStates).values({ userId: user.id, stateJson, updatedAt })
      .onConflictDoUpdate({ target: accountingStates.userId, set: { stateJson, updatedAt } });
    return Response.json({ saved: true, updatedAt });
  } catch (error) {
    console.error("state_save_failed", error);
    return Response.json({ error: "Data cloud belum dapat disimpan." }, { status: 500 });
  }
}
