import { requireUserOrRedirect } from "@/lib/auth/requireUser";
import { requireAdminOrThrow } from "@/lib/auth/requireAdmin";
import AdminClient from "./AdminClient";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminEmailsAllowlist } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user } = await requireUserOrRedirect("/login?next=/admin");

  try {
    await requireAdminOrThrow();
  } catch (err) {
    const allowlist = getAdminEmailsAllowlist();
    return (
      <Card>
        <CardContent>
          <div className="text-lg font-semibold">Admin</div>
          <div className="mt-2 text-sm text-zinc-700">You don’t have access.</div>
          <div className="mt-2 text-sm text-zinc-700">
            Signed in as:{" "}
            <code className="rounded bg-zinc-100 px-1">
              {user.email ?? "unknown-email"}
            </code>
          </div>
          <div className="mt-2 text-sm text-zinc-700">
            <code className="rounded bg-zinc-100 px-1">ADMIN_EMAILS</code> configured:{" "}
            <span className="font-medium">{allowlist.length ? "yes" : "no"}</span>
          </div>
          <div className="mt-2 text-sm text-zinc-700">
            Add your email to{" "}
            <code className="rounded bg-zinc-100 px-1">ADMIN_EMAILS</code>.
          </div>
          <div className="mt-2 text-xs text-zinc-600">
            If you just changed env vars on Vercel, redeploy so they take effect.
          </div>
        </CardContent>
      </Card>
    );
  }

  return <AdminClient />;
}

