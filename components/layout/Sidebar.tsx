"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tags,
  TicketPercent,
  Wrench,
  MessageSquareWarning,
  PanelLeftClose,
  PanelLeft,
  Users,
  MapPinned,
} from "lucide-react";
import { getUser, isSuperAdminRole } from "@/lib/auth";
import type { User } from "@/lib/types";

const BASE_NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/custom-orders", label: "Custom jobs", icon: Wrench },
  { href: "/reviews", label: "Reviews", icon: MessageSquareWarning },
];

const SUPER_NAV = [
  { href: "/locations", label: "Locations", icon: MapPinned },
  { href: "/admins", label: "Admins", icon: Users },
];

type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const nav = useMemo(() => {
    if (!isSuperAdminRole(user?.role)) return BASE_NAV;
    return [...BASE_NAV, ...SUPER_NAV];
  }, [user?.role]);

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/10 bg-sidebar text-sidebar-text transition-[width] duration-200 ${
        collapsed ? "w-[72px]" : "w-[220px]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-4">
        {!collapsed && (
          <div className="min-w-0 pl-1">
            <p className="font-display text-2xl leading-none text-white">3D Forge</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a3a3a3]">
              {isSuperAdminRole(user?.role) ? "Super desk" : "Ops desk"}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="rounded p-2 text-sidebar-text hover:bg-white/5 hover:text-white"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 text-[13px] transition ${
                active
                  ? "border-l-2 border-white bg-white/5 font-semibold text-white"
                  : "border-l-2 border-transparent hover:bg-white/[0.03] hover:text-white"
              }`}
              title={label}
            >
              <Icon size={16} strokeWidth={1.75} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/10 p-4 text-[11px] leading-relaxed text-[#737373]">
          Print shop console
          <br />
          Catalog · jobs · fulfillment
        </div>
      )}
    </aside>
  );
}
