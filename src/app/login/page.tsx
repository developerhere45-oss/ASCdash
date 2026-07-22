"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((res) => {
        if (active && res.ok) router.replace("/dashboard");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message || "Login failed");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top,#ffe1e9,transparent_38%),linear-gradient(135deg,#fff8f8,#ffffff)] p-5">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[34px] border border-[#f4dce4] bg-white/82 shadow-[0_30px_90px_rgba(82,19,42,.14)] backdrop-blur-xl lg:grid-cols-[1fr_1.05fr]">
        <div className="pink-gradient grain hidden p-10 text-white lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/18">
              <ShieldCheck size={27} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-[-0.05em]">ApnaServo</h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/72">Admin Command Center</p>
            </div>
          </div>
          <div className="mt-24 max-w-sm">
            <h2 className="text-5xl font-black tracking-[-0.06em]">Run home services like a real SaaS company.</h2>
            <p className="mt-5 text-lg text-white/78">Bookings, users, technicians, revenue, complaints and audit logs in one secure panel.</p>
          </div>
        </div>

        <form onSubmit={submit} className="p-8 sm:p-12">
          <div className="mb-9">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f32368]">Secure Login</p>
            <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Welcome back</h2>
            <p className="mt-2 text-[#756a70]">Sign in to manage ApnaServo operations.</p>
          </div>
          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-bold">Email address</span>
            <span className="relative block">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8c7a82]" size={19} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className="h-14 w-full rounded-2xl border border-[#ecd3dc] bg-white px-12 outline-none focus:border-[#f32368] focus:ring-4 focus:ring-[#ffd4e1]" />
            </span>
          </label>
          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-bold">Password</span>
            <span className="relative block">
              <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8c7a82]" size={19} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" className="h-14 w-full rounded-2xl border border-[#ecd3dc] bg-white px-12 outline-none focus:border-[#f32368] focus:ring-4 focus:ring-[#ffd4e1]" />
            </span>
          </label>
          {error && <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
          <button disabled={loading} className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#f32368] to-[#ff477b] font-black text-white shadow-[0_16px_35px_rgba(249,43,116,.24)] disabled:opacity-60">
            {loading ? "Signing in..." : "Login to Dashboard"}
          </button>
          <div className="mt-5 flex justify-between text-sm font-semibold text-[#756a70]">
            <button type="button">Forgot Password?</button>
            <span>Role based access enabled</span>
          </div>
        </form>
      </section>
    </main>
  );
}
