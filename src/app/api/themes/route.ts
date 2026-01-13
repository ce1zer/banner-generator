import { NextResponse } from "next/server";
import { listActiveThemes } from "@/lib/db/themes";

export async function GET() {
  try {
    const themes = await listActiveThemes();
    return NextResponse.json({ themes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

