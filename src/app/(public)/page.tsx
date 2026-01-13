import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="grid gap-8">
      <Card>
        <CardContent className="p-8">
          <div className="grid gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Bully Agency — AI Background/Composition Generator
            </h1>
            <p className="max-w-2xl text-sm text-zinc-700">
              Upload one dog photo, pick a theme, and generate one cinematic 4:5
              composition. Background/composition only — no text on the image.
            </p>
            <div className="pt-2">
              <Link href="/create">
                <Button>Get started</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Feature title="1) Choose theme" desc="Start with two themes; add more in /admin." />
        <Feature title="2) Upload dog photo" desc="One reference image per generation (required)." />
        <Feature title="3) Generate" desc="Login required only when you click Generate." />
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm text-zinc-700">{desc}</div>
      </CardContent>
    </Card>
  );
}

