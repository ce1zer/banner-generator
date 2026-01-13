"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, HelpText } from "@/components/ui/field";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [next, setNext] = useState("/create");

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setNext(sp.get("next") ?? "/create");
    } catch {
      setNext("/create");
    }
  }, []);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent>
          <div className="text-lg font-semibold">Sign in</div>
          <div className="mt-1 text-sm text-zinc-700">
            We’ll email you a magic link.
          </div>

          <div className="mt-6 grid gap-4">
            <Field label="Email">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
              />
            </Field>

            <Button
              className="w-full"
              disabled={!email || loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  setSent(false);
                  const origin = window.location.origin;
                  const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: {
                      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
                    },
                  });
                  if (error) throw error;
                  setSent(true);
                  toast.success("Magic link sent — check your email");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to send link");
                } finally {
                  setLoading(false);
                }
              }}
              type="button"
            >
              {loading ? "Sending…" : "Send magic link"}
            </Button>

            {sent ? (
              <HelpText>
                Link sent. Keep this tab open, then click the link in your email.
              </HelpText>
            ) : (
              <HelpText>
                After you click the link, you’ll be redirected to{" "}
                <code className="rounded bg-zinc-100 px-1">{next}</code>.
              </HelpText>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

