"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, HelpText, Input, Select, Textarea } from "@/components/ui/field";

type ThemeRow = {
  id: string;
  slug: string;
  name: string;
  prompt_template: string;
  is_active: boolean;
  access_tier: "free" | "pro";
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export default function AdminClient() {
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => themes.find((t) => t.id === selectedId) ?? null,
    [themes, selectedId],
  );

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/themes");
      const json = (await res.json()) as { themes?: ThemeRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load themes");
      setThemes(json.themes ?? []);
      setSelectedId((prev) => prev ?? json.themes?.[0]?.id ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load themes");
    } finally {
      setLoading(false);
    }
  }

  async function createTheme() {
    try {
      const res = await fetch("/api/admin/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: `new-theme-${Math.floor(Math.random() * 10000)}`,
          name: "New Theme",
          prompt_template:
            "Create a single {{ASPECT}} portrait composition with a dog as the hero subject.\n\nStyle: {{STYLE}}\nTheme: {{THEME_NAME}} ({{THEME_SLUG}})\n\nConstraints: absolutely no text, no letters, no logos.",
          is_active: false,
          access_tier: "free",
          sort_order: 0,
        }),
      });
      const json = (await res.json()) as { theme?: ThemeRow; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create theme");
      toast.success("Theme created");
      await refresh();
      setSelectedId(json.theme!.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create theme");
    }
  }

  async function saveTheme(patch: Partial<ThemeRow>) {
    if (!selected) return;
    try {
      const res = await fetch(`/api/admin/themes/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { theme?: ThemeRow; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save theme");
      toast.success("Saved");
      setThemes((prev) => prev.map((t) => (t.id === selected.id ? json.theme! : t)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function deleteTheme() {
    if (!selected) return;
    if (!confirm(`Delete theme "${selected.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/themes/${selected.id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to delete theme");
      toast.success("Deleted");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Admin — Themes</div>
              <div className="text-sm text-zinc-700">
                CRUD prompt templates + future-ready access tiers (not enforced yet)
              </div>
            </div>
            <Button onClick={createTheme} type="button">
              New theme
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="p-4">
          <div className="text-sm font-semibold">Themes</div>
          <div className="mt-3 grid gap-2">
            {loading ? (
              <div className="text-sm text-zinc-600">Loading…</div>
            ) : themes.length === 0 ? (
              <div className="text-sm text-zinc-600">No themes</div>
            ) : (
              themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                    selectedId === t.id
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-zinc-600">{t.is_active ? "active" : "off"}</div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">{t.slug}</div>
                </button>
              ))
            )}
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
          {!selected ? (
            <div className="text-sm text-zinc-600">Select a theme</div>
          ) : (
            <ThemeEditor
              key={selected.id}
              theme={selected}
              onSave={(patch) => saveTheme(patch)}
              onDelete={deleteTheme}
            />
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ThemeEditor(props: {
  theme: ThemeRow;
  onSave: (patch: Partial<ThemeRow>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [slug, setSlug] = useState(props.theme.slug);
  const [name, setName] = useState(props.theme.name);
  const [promptTemplate, setPromptTemplate] = useState(props.theme.prompt_template);
  const [isActive, setIsActive] = useState(props.theme.is_active);
  const [accessTier, setAccessTier] = useState<"free" | "pro">(props.theme.access_tier);
  const [sortOrder, setSortOrder] = useState<number>(props.theme.sort_order);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await props.onSave({
        slug,
        name,
        prompt_template: promptTemplate,
        is_active: isActive,
        access_tier: accessTier,
        sort_order: sortOrder,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Edit theme</div>
          <div className="text-xs text-zinc-600">ID: {props.theme.id}</div>
        </div>
        <Button onClick={() => props.onDelete()} variant="danger" size="sm" type="button">
          Delete
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Slug">
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </Field>
        <Field label="Access tier (future-ready)">
          <Select
            value={accessTier}
            onChange={(e) => setAccessTier(e.target.value as any)}
          >
            <option value="free">free</option>
            <option value="pro">pro</option>
          </Select>
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Active
      </label>

      <div className="grid gap-2">
        <div className="text-sm font-medium">Prompt template</div>
        <HelpText>
          Placeholders: <code>{"{{ASPECT}}"}</code>, <code>{"{{STYLE}}"}</code>,{" "}
          <code>{"{{THEME_NAME}}"}</code>, <code>{"{{THEME_SLUG}}"}</code>
        </HelpText>
        <Textarea
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          className="min-h-[260px]"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={save}
          disabled={saving}
          type="button"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <div className="text-xs text-zinc-600">
          Updated: {new Date(props.theme.updated_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

