import Link from "next/link";
import { z } from "zod";
import { requireUserOrRedirect } from "@/lib/auth/requireUser";
import { createSignedUrl } from "@/lib/storage/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MyGenerationPage(props: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await requireUserOrRedirect("/login?next=/my");
  const { id } = z.object({ id: z.string().uuid() }).parse(await props.params);

  const { data: gen, error } = await supabase
    .from("generations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !gen) {
    return (
      <Card>
        <CardContent>
          <div className="font-semibold">Not found</div>
          <div className="mt-2 text-sm text-zinc-700">
            <Link href="/my" className="underline">
              Back to My
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const signedUrl =
    gen.status === "succeeded" && gen.result_image_path
      ? await createSignedUrl({
          bucket: "generated",
          path: gen.result_image_path,
          expiresInSeconds: 60,
        })
      : null;

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Generation</div>
              <div className="text-sm text-zinc-700">
                {new Date(gen.created_at).toLocaleString()} • {gen.status}
              </div>
            </div>
            <Link href="/my">
              <Button variant="secondary">Back</Button>
            </Link>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-zinc-800">
            <div>
              <span className="font-semibold">ID:</span> {gen.id}
            </div>
            {gen.error ? (
              <div className="text-red-700">
                <span className="font-semibold">Error:</span> {gen.error}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {signedUrl ? (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Result</div>
                <div className="text-sm text-zinc-700">
                  {gen.image_width}×{gen.image_height}
                </div>
              </div>
              <a href={signedUrl} download>
                <Button>Download</Button>
              </a>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signedUrl} alt="Generated" className="h-auto w-full" />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

