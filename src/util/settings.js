const SETTINGS_KEY = "bloomia.settings.v1";

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  const cleaned = {
    playerName: (settings.playerName ?? "").toString().trim().slice(0, 24),
    supabaseUrl: (settings.supabaseUrl ?? "").toString().trim(),
    supabaseAnonKey: (settings.supabaseAnonKey ?? "").toString().trim(),
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(cleaned));
  return cleaned;
}

export function clearSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}
