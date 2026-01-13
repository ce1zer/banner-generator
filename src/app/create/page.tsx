"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ThemeListItem } from "@/lib/types/models";
import {
  clearDraftPhoto,
  getOrCreateDraftId,
  isPendingGenerate,
  loadDraft,
  loadDraftPhoto,
  saveDraft,
  saveDraftPhoto,
  setPendingGenerate,
} from "@/lib/draft/clientDraft";

export const dynamic = "force-dynamic";

type GenerationView =
  | { state: "idle" }
  | { state: "starting" }
  | { state: "polling"; generationId: string }
  | { state: "succeeded"; generationId: string; signedUrl: string }
  | { state: "failed"; generationId?: string; error: string };

export default function CreatePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const draftIdRef = useRef<string | null>(null);

  const [themes, setThemes] = useState<ThemeListItem[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);

  const [themeId, setThemeId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [contact, setContact] = useState("");
  const [dogPhoto, setDogPhoto] = useState<File | null>(null);

  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [authSent, setAuthSent] = useState(false);

  const [view, setView] = useState<GenerationView>({ state: "idle" });

  // Boot: draft + persisted fields/photo.
  useEffect(() => {
    const draftId = getOrCreateDraftId();
    draftIdRef.current = draftId;
    const existing = loadDraft(draftId);
    setThemeId(existing.themeId ?? "");
    setTitle(existing.title ?? "");
    setSubtitle(existing.subtitle ?? "");
    setContact(existing.contact ?? "");
    loadDraftPhoto(draftId).then((file) => {
      if (file) setDogPhoto(file);
    });
  }, []);

  // Persist draft (no DB writes unauthenticated).
  useEffect(() => {
    const draftId = draftIdRef.current;
    if (!draftId) return;
    saveDraft(draftId, { themeId, title, subtitle, contact });
  }, [themeId, title, subtitle, contact]);

  // Load active themes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingThemes(true);
        const res = await fetch("/api/themes");
        const json = (await res.json()) as { themes?: ThemeListItem[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed to load themes");
        if (!cancelled) setThemes(json.themes ?? []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load themes");
      } finally {
        if (!cancelled) setLoadingThemes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // If user clicked Generate before login, resume automatically after auth.
  useEffect(() => {
    const draftId = draftIdRef.current;
    if (!draftId) return;
    if (!isPendingGenerate(draftId)) return;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      setPendingGenerate(draftId, false);
      await startGeneration();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const onPickPhoto = useCallback(async (file: File | null) => {
    const draftId = draftIdRef.current;
    setDogPhoto(file);
    if (!draftId) return;
    if (file) await saveDraftPhoto(draftId, file);
    else await clearDraftPhoto(draftId);
  }, []);

  const startGeneration = useCallback(async () => {
    if (!themeId) {
      toast.error("Theme required");
      return;
    }
    if (!dogPhoto) {
      toast.error("Upload required");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Login required to generate");
      const draftId = draftIdRef.current;
      if (draftId) setPendingGenerate(draftId, true);
      setAuthOpen(true);
      return;
    }

    setView({ state: "starting" });
    try {
      const fd = new FormData();
      fd.set("themeId", themeId);
      fd.set("title", title);
      fd.set("subtitle", subtitle);
      fd.set("contact", contact);
      fd.set("dogPhoto", dogPhoto);

      const res = await fetch("/api/generations/start", { method: "POST", body: fd });
      const json = (await res.json()) as { generationId?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to start generation");
      const generationId = json.generationId!;
      setView({ state: "polling", generationId });
      toast.success("Generation started");
      await pollGeneration(generationId);
    } catch (err) {
      setView({ state: "failed", error: err instanceof Error ? err.message : "Failed" });
      toast.error(err instanceof Error ? err.message : "Failed to start generation");
    }
  }, [themeId, dogPhoto, title, subtitle, contact, supabase]);

  const pollGeneration = useCallback(async (generationId: string) => {
    const startedAt = Date.now();
    while (true) {
      const res = await fetch(`/api/generations/${generationId}`, { cache: "no-store" });
      const json = (await res.json()) as any;
      if (!res.ok) {
        setView({ state: "failed", generationId, error: json?.error ?? "Polling failed" });
        return;
      }
      const gen = json.generation as {
        status: string;
        signedUrl: string | null;
        error: string | null;
      };

      if (gen.status === "succeeded" && gen.signedUrl) {
        setView({ state: "succeeded", generationId, signedUrl: gen.signedUrl });
        toast.success("Generation complete");
        return;
      }
      if (gen.status === "failed") {
        setView({
          state: "failed",
          generationId,
          error: gen.error ?? "Generation failed — try again",
        });
        toast.error("Generation failed — try again");
        return;
      }

      // Client-side timeout guard (matches server-side hard timeout).
      if (Date.now() - startedAt > 60_000) {
        setView({
          state: "failed",
          generationId,
          error: "Generation timed out — try again",
        });
        toast.error("Generation timed out — try again");
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }, []);

  const themeOptions = useMemo(() => {
    return themes.map((t) => (
      <option key={t.id} value={t.id}>
        {t.name}
      </option>
    ));
  }, [themes]);

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Create</h2>
          <p className="text-sm text-zinc-700">
            Step 1) Choose theme → Step 2) Upload dog photo → Step 3) Generate
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Theme</label>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
              disabled={loadingThemes}
            >
              <option value="">{loadingThemes ? "Loading…" : "Select a theme"}</option>
              {themeOptions}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Title (optional)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
              placeholder="e.g., Bullies for the Win"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Subtitle (optional)</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
              placeholder="e.g., XL • ABKC • Health Tested"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Contact (optional)</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
              placeholder="e.g., @instagram or phone"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Dog photo (required)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            {dogPhoto ? (
              <div className="text-xs text-zinc-600">
                Selected: <span className="font-medium">{dogPhoto.name}</span>{" "}
                <button
                  className="ml-2 underline"
                  onClick={() => onPickPhoto(null)}
                  type="button"
                >
                  remove
                </button>
              </div>
            ) : null}
          </div>

          <div className="pt-2">
            <button
              onClick={startGeneration}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={view.state === "starting" || view.state === "polling"}
              type="button"
            >
              {view.state === "starting" || view.state === "polling"
                ? "Generating…"
                : "Generate (4:5)"}
            </button>
          </div>
        </div>
      </div>

      {view.state === "succeeded" ? (
        <ResultCard signedUrl={view.signedUrl} />
      ) : null}

      {view.state === "failed" ? (
        <div className="rounded-2xl border border-red-200 bg-white p-6">
          <div className="font-semibold text-red-700">Generation failed</div>
          <div className="mt-1 text-sm text-zinc-700">{view.error}</div>
          <div className="mt-4">
            <button
              onClick={startGeneration}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        email={email}
        setEmail={setEmail}
        authSent={authSent}
        onSendLink={async () => {
          try {
            setAuthSent(false);
            const origin = window.location.origin;
            const { error } = await supabase.auth.signInWithOtp({
              email,
              options: {
                emailRedirectTo: `${origin}/auth/callback?next=/create`,
              },
            });
            if (error) throw error;
            setAuthSent(true);
            toast.success("Magic link sent — check your email");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send link");
          }
        }}
      />
    </div>
  );
}

function ResultCard({ signedUrl }: { signedUrl: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Result</div>
          <div className="text-sm text-zinc-700">Your generated 4:5 composition</div>
        </div>
        <a
          href={signedUrl}
          download
          className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Download
        </a>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={signedUrl} alt="Generated" className="h-auto w-full" />
      </div>
    </div>
  );
}

function AuthModal(props: {
  open: boolean;
  onClose: () => void;
  email: string;
  setEmail: (v: string) => void;
  authSent: boolean;
  onSendLink: () => Promise<void>;
}) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Login required</div>
            <div className="text-sm text-zinc-700">
              We’ll email you a magic link. After you click it, generation continues automatically.
            </div>
          </div>
          <button
            onClick={props.onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <label className="text-sm font-medium">Email</label>
          <input
            value={props.email}
            onChange={(e) => props.setEmail(e.target.value)}
            className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
            placeholder="you@example.com"
            type="email"
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={props.onSendLink}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            disabled={!props.email}
            type="button"
          >
            Send magic link
          </button>
        </div>

        {props.authSent ? (
          <div className="mt-3 text-sm text-zinc-700">
            Link sent. Keep this tab open, then click the link in your email.
          </div>
        ) : null}
      </div>
    </div>
  );
}

