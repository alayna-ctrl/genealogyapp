"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <nav className="border-b border-violet-100 bg-violet-50/40">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3 text-sm">
          <Link href="/dashboard" className="font-semibold text-[#1F3864]">Genealogy Cleanup</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/people">People</Link>
          <Link href="/people/new">Add Person</Link>
          <button className="ml-auto ui-btn-soft !px-2 !py-1" onClick={signOut}>Sign out</button>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
