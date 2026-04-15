import { ClientPreferences } from "./types";

const STORAGE_KEY = "nba-playoffs-bracket:client:v2";
const STORAGE_VERSION = 2;

const createClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `client-${Math.random().toString(36).slice(2)}-${Date.now()}`;

const createInitialPreferences = (): ClientPreferences => ({
  version: STORAGE_VERSION,
  clientId: createClientId(),
  currentView: "my-bracket",
});

const normalizePreferences = (
  value?: Partial<ClientPreferences> | null,
): ClientPreferences => ({
  ...createInitialPreferences(),
  ...value,
  version: STORAGE_VERSION,
});

export const loadClientPreferences = (): ClientPreferences => {
  if (typeof window === "undefined") {
    return createInitialPreferences();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const initial = createInitialPreferences();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as ClientPreferences;
    const normalized = normalizePreferences(parsed);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    const initial = createInitialPreferences();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

export const saveClientPreferences = (preferences: ClientPreferences) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizePreferences(preferences)),
  );
};

export const buildPoolInviteLink = (origin: string, inviteCode: string) =>
  `${origin}?pool=${encodeURIComponent(inviteCode)}`;

export const buildEntryShareLink = (
  origin: string,
  inviteCode: string,
  entryId: string,
) =>
  `${origin}?pool=${encodeURIComponent(inviteCode)}&entry=${encodeURIComponent(entryId)}`;
