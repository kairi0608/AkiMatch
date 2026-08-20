export const RESPONSE_CREDENTIALS_KEY = "akimatch.response-credentials.v1";

export type ParticipantCredential = {
  scheduleId: string;
  participantId: string;
  participantName: string;
  editToken: string;
};

type CredentialStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): CredentialStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function isCredential(value: unknown): value is ParticipantCredential {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.scheduleId === "string" && item.scheduleId.length > 0 &&
    typeof item.participantId === "string" && item.participantId.length > 0 &&
    typeof item.participantName === "string" && item.participantName.length > 0 &&
    typeof item.editToken === "string" && item.editToken.length >= 40
  );
}

export function listResponseCredentials(
  scheduleId?: string,
  storage = defaultStorage(),
): ParticipantCredential[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(RESPONSE_CREDENTIALS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const credentials = parsed.filter(isCredential);
    return scheduleId
      ? credentials.filter((credential) => credential.scheduleId === scheduleId)
      : credentials;
  } catch {
    return [];
  }
}

export function saveResponseCredential(
  credential: ParticipantCredential,
  storage = defaultStorage(),
) {
  if (!storage || !isCredential(credential)) return;
  const current = listResponseCredentials(undefined, storage).filter(
    (item) => !(
      item.scheduleId === credential.scheduleId &&
      item.participantId === credential.participantId
    ),
  );
  storage.setItem(RESPONSE_CREDENTIALS_KEY, JSON.stringify([...current, credential]));
}

export function removeResponseCredential(
  scheduleId: string,
  participantId: string,
  storage = defaultStorage(),
) {
  if (!storage) return;
  const next = listResponseCredentials(undefined, storage).filter(
    (item) => !(item.scheduleId === scheduleId && item.participantId === participantId),
  );
  storage.setItem(RESPONSE_CREDENTIALS_KEY, JSON.stringify(next));
}

export function findResponseCredential(
  scheduleId: string,
  participantId: string,
  storage = defaultStorage(),
) {
  return listResponseCredentials(scheduleId, storage).find(
    (credential) => credential.participantId === participantId,
  ) ?? null;
}

export function responseManagementPath(credential: ParticipantCredential) {
  return `/schedule/${encodeURIComponent(credential.scheduleId)}/response/${encodeURIComponent(credential.participantId)}#token=${encodeURIComponent(credential.editToken)}`;
}

export function readResponseTokenFragment(hash: string) {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token?.trim() || null;
}

