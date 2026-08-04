"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken, getUser, isAdminRole } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/orders": "Orders",
  "/products": "Products",
  "/categories": "Categories",
  "/coupons": "Coupons",
  "/custom-orders": "Custom jobs",
  "/reviews": "Reviews",
  "/admins": "Admins",
  "/locations": "Locations",
};

function resolveTitle(pathname: string) {
  const exact = TITLES[pathname];
  if (exact) return exact;
  const base = Object.keys(TITLES).find((key) => pathname.startsWith(`${key}/`));
  if (base === "/orders") return "Order Detail";
  if (base === "/products") return pathname.includes("/edit/") ? "Product Editor" : "New Product";
  if (base === "/custom-orders") return "Custom Order Detail";
  return "Admin";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user || !isAdminRole(user.role)) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted">
        Checking session…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={resolveTitle(pathname)} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
