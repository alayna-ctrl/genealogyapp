import { createClient } from "@supabase/supabase-js";

const PLACEHOLDER_VALUES = new Set([
  "https://your-project.supabase.co",
  "https://your-project-ref.supabase.co",
  "your-anon-key",
  "your-service-role-key",
  "YOUR_SUPABASE_URL",
  "YOUR_SUPABASE_ANON_KEY",
]);

function ensure(name: string, value: string | undefined) {
  if (!value || PLACEHOLDER_VALUES.has(value)) {
    throw new Error(
      `Setup required: set ${name} in .env.local. Required vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (Supabase Settings -> API).`,
    );
  }
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  ensure("NEXT_PUBLIC_SUPABASE_URL", url);
  ensure("NEXT_PUBLIC_SUPABASE_ANON_KEY", anon);
  ensure("SUPABASE_SERVICE_ROLE_KEY", serviceKey);

  return createClient(url!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
