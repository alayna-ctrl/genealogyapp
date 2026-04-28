import { createServerClient } from "@supabase/ssr";
import { headers } from "next/headers";

export async function createClient() {
  const headerStore = await headers();
  const cookieHeader = headerStore.get("cookie") ?? "";

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieHeader
            .split(";")
            .map((chunk) => chunk.trim())
            .filter(Boolean)
            .map((chunk) => {
              const [name, ...rest] = chunk.split("=");
              return { name, value: rest.join("=") };
            });
        },
        setAll() {
          // Server components read auth state only; cookie writes are handled in middleware.
        },
      },
    },
  );
}
