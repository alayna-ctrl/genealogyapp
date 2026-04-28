export type PersonRow = {
  id: string;
  user_id: string;
  person_id: string;
  full_name: string;
  main_question: string | null;
  current_step: number;
  status: string;
  generation_number: number | null;
  is_direct_line: boolean;
  last_worked_at: string | null;
  finished_at: string | null;
  created_at: string;
};
