import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { supabase, user: data.user };
}

export function buildCleanupNote(payload: {
  status?: string;
  claim_being_checked?: string;
  evidence_for?: string;
  evidence_against?: string;
  strongest_sources?: string;
  still_needed?: string;
}) {
  return `CLEANUP NOTE

Status: ${payload.status ?? ""}

Main question checked:
${payload.claim_being_checked ?? ""}

What seems solid:
${payload.evidence_for ?? ""}

What is still uncertain:
${payload.evidence_against ?? ""}

Strongest sources:
${payload.strongest_sources ?? ""}

Next steps:
${payload.still_needed ?? ""}`;
}
