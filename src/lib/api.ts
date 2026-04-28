import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function requireUser() {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: (error as Error).message },
        { status: 500 },
      ),
    };
  }
  return {
    supabase,
    user: { id: process.env.SINGLE_USER_ID ?? "single-user-local" },
  };
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
