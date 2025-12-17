function normalizeUrl(url) {
  const trimmed = (url ?? "").toString().trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

async function requestJson({ url, method, anonKey, body }) {
  const res = await fetch(url, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} ${url} failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ""}`);
  }

  const text = await res.text().catch(() => "");
  if (!text) return null;
  return JSON.parse(text);
}

export async function fetchLeaderboard({ supabaseUrl, supabaseAnonKey, limit }) {
  const base = normalizeUrl(supabaseUrl);
  const url = `${base}/rest/v1/leaderboard?select=*&limit=${encodeURIComponent(limit ?? 20)}`;
  const rows = await requestJson({ url, method: "GET", anonKey: supabaseAnonKey });
  return Array.isArray(rows) ? rows : [];
}

export async function submitScore({ supabaseUrl, supabaseAnonKey, record }) {
  const base = normalizeUrl(supabaseUrl);
  const url = `${base}/rest/v1/scores`;
  await requestJson({
    url,
    method: "POST",
    anonKey: supabaseAnonKey,
    body: record,
  });
}
