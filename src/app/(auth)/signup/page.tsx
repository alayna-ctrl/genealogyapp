"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) return setError(authError.message);
    setMessage("Check your email to confirm your account.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
      <form className="w-full max-w-md space-y-4 rounded border bg-white p-6" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-semibold text-[#1F3864]">Sign up</h1>
        <input className="w-full rounded border p-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border p-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="w-full rounded border p-2" placeholder="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        <button className="w-full rounded bg-[#2F75B6] p-2 text-white" type="submit">Create account</button>
        <p className="text-sm text-slate-600">Already have one? <Link href="/login" className="text-[#2F75B6]">Log in</Link></p>
      </form>
    </div>
  );
}
