import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Supabase environment variables missing" }, { status: 500 });
  }
  if (url.includes("your-project-ref.supabase.co") || key === "your-anon-key") {
    return NextResponse.json(
      { error: "Supabase env values are placeholders. Set real project URL and anon key in .env.local and restart dev server." },
      { status: 500 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Could not reach Supabase Auth endpoint. Check NEXT_PUBLIC_SUPABASE_URL and network. (${(error as Error).message})` },
      { status: 500 },
    );
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: payload.msg || payload.error_description || payload.error || "Signup failed" }, { status: res.status });
  }

  return NextResponse.json({ ok: true, data: payload });
}
