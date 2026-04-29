import { createAdminClient, checkAdminEnvReadiness } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const readiness = checkAdminEnvReadiness();
  if (!readiness.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: "env_missing",
        missing: readiness.missing,
      },
      { status: 500 },
    );
  }

  try {
    const supabase = createAdminClient();
    const [people, sources] = await Promise.all([
      supabase.from("people").select("id", { head: true, count: "exact" }),
      supabase.from("sources").select("id", { head: true, count: "exact" }),
    ]);
    if (people.error || sources.error) {
      return NextResponse.json(
        {
          ok: false,
          reason: "schema_not_ready",
          details: people.error?.message ?? sources.error?.message,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: "client_init_failed", details: (error as Error).message },
      { status: 500 },
    );
  }
}
