import { del, get, set } from "idb-keyval";

export type DraftState = {
  themeId?: string;
  title?: string;
  subtitle?: string;
  contact?: string;
};

const DRAFT_ID_KEY = "bully:draftId";

function draftKey(draftId: string) {
  return `bully:draft:${draftId}`;
}

function pendingKey(draftId: string) {
  return `bully:pendingGenerate:${draftId}`;
}

function photoKey(draftId: string) {
  return `bully:draftPhoto:${draftId}`;
}

export function getOrCreateDraftId() {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(DRAFT_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(DRAFT_ID_KEY, id);
  return id;
}

export function loadDraft(draftId: string): DraftState {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(draftKey(draftId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as DraftState;
  } catch {
    return {};
  }
}

export function saveDraft(draftId: string, next: DraftState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(draftKey(draftId), JSON.stringify(next));
}

export function setPendingGenerate(draftId: string, pending: boolean) {
  if (typeof window === "undefined") return;
  if (pending) window.localStorage.setItem(pendingKey(draftId), "1");
  else window.localStorage.removeItem(pendingKey(draftId));
}

export function isPendingGenerate(draftId: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(pendingKey(draftId)) === "1";
}

export async function saveDraftPhoto(draftId: string, file: File) {
  await set(photoKey(draftId), { blob: file, name: file.name, type: file.type });
}

export async function loadDraftPhoto(draftId: string): Promise<File | null> {
  const stored = (await get(photoKey(draftId))) as
    | { blob: Blob; name?: string; type?: string }
    | undefined;
  if (!stored?.blob) return null;
  const name = stored.name ?? "dog-photo";
  const type = stored.type ?? stored.blob.type ?? "application/octet-stream";
  return new File([stored.blob], name, { type });
}

export async function clearDraftPhoto(draftId: string) {
  await del(photoKey(draftId));
}

