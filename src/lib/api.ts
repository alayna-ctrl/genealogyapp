import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const DEFAULT_SINGLE_USER_ID = "00000000-0000-0000-0000-000000000001";

function normalizeUserId(raw?: string) {
  if (!raw) return DEFAULT_SINGLE_USER_ID;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw,
    );
  return isUuid ? raw : DEFAULT_SINGLE_USER_ID;
}

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
    user: { id: normalizeUserId(process.env.SINGLE_USER_ID) },
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
