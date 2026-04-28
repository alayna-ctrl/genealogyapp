export type Status = "Verified" | "Likely" | "Needs Proof" | "Conflict" | "Probably Wrong" | "Done for Now";
export type KeepDecision = "Keep" | "Maybe" | "No" | "Clue Only";
export type QualityTier = "Original Record" | "Derivative Record" | "Authored Work" | "Family Tree / Other" | "Find A Grave" | "Unknown";
export type RelationshipType = "Spouse" | "Connecting Child" | "Father" | "Mother" | "Other";
export type RelationshipStatus = "Verified" | "Likely" | "Needs Proof" | "Conflict" | "Probably Wrong";

export type Person = {
  id: string;
  user_id: string;
  person_id: string;
  full_name: string;
  birth_date?: string;
  birth_place?: string;
  death_date?: string;
  death_place?: string;
  spouse_name?: string;
  marriage_date?: string;
  father_name?: string;
  mother_name?: string;
  connecting_child?: string;
  main_question?: string;
  current_step: number;
  status: Status;
  concern?: string;
  generation_number?: number;
  is_direct_line: boolean;
  is_fast_track: boolean;
  cleanup_note_added: boolean;
  ancestry_profile_url?: string;
  started_at?: string;
  last_worked_at?: string;
  finished_at?: string;
  created_at: string;
};

export type Source = {
  id: string;
  user_id: string;
  person_id: string;
  person_name: string;
  source_title: string;
  record_type?: string;
  record_year?: string;
  record_place?: string;
  what_it_says?: string;
  what_it_proves?: string;
  what_it_does_not_prove?: string;
  relationship_proven?: string;
  keep_decision?: KeepDecision;
  confidence?: string;
  source_quality_tier?: QualityTier;
  ancestry_url?: string;
  downloaded: boolean;
  notes?: string;
  created_at: string;
};

export type Relationship = {
  id: string;
  user_id: string;
  person_id: string;
  person_name: string;
  relationship_type: RelationshipType;
  related_person_name?: string;
  claim?: string;
  evidence_summary?: string;
  status: RelationshipStatus;
  sources_supporting?: string;
  problems?: string;
  suggested_searches?: string;
  created_at: string;
};

export type HintSearch = {
  id: string;
  user_id: string;
  person_id: string;
  person_name: string;
  research_question?: string;
  type: string;
  site?: string;
  search_terms?: string;
  result_description?: string;
  decision?: string;
  same_name_risk?: string;
  next_step?: string;
  created_at: string;
};

export type EvidenceSummary = {
  id: string;
  user_id: string;
  person_id: string;
  person_name: string;
  claim_being_checked?: string;
  evidence_for?: string;
  evidence_against?: string;
  best_conclusion?: string;
  status?: Status;
  strongest_sources?: string;
  still_needed?: string;
  cleanup_note?: string;
  created_at: string;
};

export type NextStep = {
  id: string;
  user_id: string;
  person_id: string;
  person_name: string;
  task: string;
  priority: "High" | "Medium" | "Low";
  where_to_search?: string;
  why_it_matters?: string;
  done: boolean;
  done_at?: string;
  created_at: string;
};
