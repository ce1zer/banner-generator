import { requireUserOrRedirect } from "@/lib/auth/requireUser";
import { requireAdminOrThrow } from "@/lib/auth/requireAdmin";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireUserOrRedirect("/create");

  try {
    await requireAdminOrThrow();
  } catch (err) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="text-lg font-semibold">Admin</div>
        <div className="mt-2 text-sm text-zinc-700">You don’t have access.</div>
        <div className="mt-2 text-sm text-zinc-700">
          Add your email to <code className="rounded bg-zinc-100 px-1">ADMIN_EMAILS</code>.
        </div>
      </div>
    );
  }

  return <AdminClient />;
}

