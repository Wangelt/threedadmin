"use client";

import { LogOut } from "lucide-react";
import { clearSession, getUser, isSuperAdminRole } from "@/lib/auth";
import { initials } from "@/lib/format";
import { useEffect, useState } from "react";
import type { User } from "@/lib/types";

type Props = {
  title: string;
};

function scopeLabel(user: User | null) {
  if (!user) return "admin";
  if (isSuperAdminRole(user.role)) return "Super admin · all locations";
  if (typeof user.location === "object" && user.location) {
    return `${user.role.replace("_", " ")} · ${user.location.name}`;
  }
  return user.role.replace("_", " ");
}

export function Topbar({ title }: Props) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  function logout() {
    clearSession();
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-white/90 px-6 py-4 backdrop-blur-sm">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Floor desk
        </p>
        <h2 className="font-display text-[1.75rem] leading-tight text-ink">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 border border-border bg-white px-2.5 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center bg-black text-xs font-bold text-white">
            {initials(user?.name)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight">{user?.name || "Admin"}</p>
            <p className="text-[11px] capitalize text-muted">{scopeLabel(user)}</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary btn-pinned" onClick={logout}>
          <LogOut size={15} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
