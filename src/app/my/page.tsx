import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/auth/requireUser";
import { createSignedUrl } from "@/lib/storage/admin";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const { supabase, user } = await requireUserOrRedirect("/create");

  const { data, error } = await supabase
    .from("generations")
    .select("id,status,created_at,result_image_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="font-semibold">My Generations</div>
        <div className="mt-2 text-sm text-red-700">{error.message}</div>
      </div>
    );
  }

  const rows =
    (data ?? []).map(async (g) => {
      const thumb =
        g.status === "succeeded" && g.result_image_path
          ? await createSignedUrl({
              bucket: "generated",
              path: g.result_image_path,
              expiresInSeconds: 60,
            })
          : null;
      return { ...g, thumb };
    }) ?? [];
  const items = await Promise.all(rows);

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">My generations</div>
            <div className="text-sm text-zinc-700">Your recent jobs</div>
          </div>
          <Link
            href="/create"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            New generation
          </Link>
        </div>
      </div>

      <div className="grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700">
            No generations yet.
          </div>
        ) : null}

        {items.map((g) => (
          <Link
            key={g.id}
            href={`/my/${g.id}`}
            className="rounded-2xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                {g.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                    {g.status}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{g.id}</div>
                <div className="text-xs text-zinc-700">
                  {new Date(g.created_at).toLocaleString()} • {g.status}
                </div>
              </div>
              <div className="text-sm text-zinc-600">View</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

