"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getErrorMessage } from "@/lib/api";
import { getToken, getUser, isAdminRole, setSession } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { error: toastError, success } = useToast();
  const [email, setEmail] = useState("admin@3dforge.local");
  const [password, setPassword] = useState("Admin12345!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token && user && isAdminRole(user.role)) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ user: User; accessToken: string }>("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });

      if (!isAdminRole(data.user.role)) {
        const msg = "This account does not have admin access.";
        setError(msg);
        toastError(msg);
        return;
      }

      setSession(data.accessToken, data.user);
      success("Signed in.");
      router.replace("/dashboard");
    } catch (err) {
      const msg = getErrorMessage(err, "Login failed");
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-stretch overflow-hidden bg-black">
      <div className="relative hidden w-[46%] flex-col justify-between border-r border-white/10 p-10 text-white lg:flex">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a3a3a3]">
            Workshop console
          </p>
          <h1 className="font-display mt-4 text-5xl leading-[1.05]">
            Run the print floor
            <br />
            without the noise.
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-[#a3a3a3]">
          Orders, catalog, custom jobs, and reviews — one ops desk for the shop.
        </p>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-[#f4f4f4] px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md border border-[#e5e5e5] bg-white p-8 shadow-[6px_6px_0_#0a0a0a]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            3D Forge
          </p>
          <h2 className="font-display mt-2 text-4xl text-ink">Sign in</h2>
          <p className="mt-2 text-sm text-muted">Ops access for admins only.</p>

          <div className="mt-7 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error ? <p className="flash-err mt-4 px-3 py-2 text-sm">{error}</p> : null}

          <button type="submit" className="btn btn-primary mt-6 w-full" disabled={loading}>
            {loading ? "Checking…" : "Enter ops desk"}
          </button>
        </form>
      </div>
    </div>
  );
}
