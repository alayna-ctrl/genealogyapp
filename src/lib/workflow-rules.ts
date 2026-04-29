import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkflowRequirement = {
  step: number;
  label: string;
  met: boolean;
};

async function hasAtLeastOne(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  personId: string,
) {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("person_id", personId);
  return Boolean(count);
}

export async function getWorkflowRequirements(input: {
  supabase: SupabaseClient;
  userId: string;
  personId: string;
  newStep: number;
  isFastTrack: boolean;
  mainQuestion: string | null;
  cleanupNoteAdded: boolean;
}) {
  const requirements: WorkflowRequirement[] = [];
  const { supabase, userId, personId, newStep, isFastTrack, mainQuestion, cleanupNoteAdded } = input;

  if (newStep >= 2) {
    requirements.push({
      step: 2,
      label: "Main question is set",
      met: Boolean(mainQuestion?.trim()),
    });
  }

  if (newStep >= 3) {
    requirements.push({
      step: 3,
      label: "At least 1 source exists",
      met: await hasAtLeastOne(supabase, "sources", userId, personId),
    });
  }
  if (newStep >= 4) {
    requirements.push({
      step: 4,
      label: "At least 1 relationship exists",
      met: await hasAtLeastOne(supabase, "relationships", userId, personId),
    });
  }
  if (newStep >= 5) {
    requirements.push({
      step: 5,
      label: "At least 1 hint/search exists",
      met: await hasAtLeastOne(supabase, "hints_searches", userId, personId),
    });
  }

  if (!isFastTrack && newStep >= 6) {
    requirements.push({
      step: 6,
      label: "At least 1 evidence summary exists",
      met: await hasAtLeastOne(supabase, "evidence_summary", userId, personId),
    });
  }

  if (!isFastTrack && newStep >= 7) {
    requirements.push({
      step: 7,
      label: "Cleanup checklist completed",
      met: cleanupNoteAdded,
    });
  }

  return requirements;
}
