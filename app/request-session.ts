const SESSION_COOKIE = "umkm_session_id";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function getOrCreateSession(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  const existing = match?.[1];

  if (existing && /^[a-zA-Z0-9-]{8,80}$/.test(existing)) {
    return { id: existing, isNew: false };
  }

  return { id: crypto.randomUUID(), isNew: true };
}

export function attachSessionCookie(response: Response, request: Request, sessionId: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append(
    "set-cookie",
    `${SESSION_COOKIE}=${sessionId}; Path=/; Max-Age=${ONE_YEAR}; HttpOnly; SameSite=Lax${secure}`,
  );
  return response;
}
