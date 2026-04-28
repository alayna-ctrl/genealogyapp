"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded border bg-white p-6">
        <h1 className="text-2xl font-semibold text-[#1F3864]">Log in</h1>
        <input className="w-full rounded border p-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="w-full rounded bg-[#2F75B6] p-2 text-white" type="submit">Log in</button>
        <p className="text-sm text-slate-600">Need an account? <Link className="text-[#2F75B6]" href="/signup">Sign up</Link></p>
      </form>
    </div>
  );
}
