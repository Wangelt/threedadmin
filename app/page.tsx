"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser, isAdminRole } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token && user && isAdminRole(user.role)) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted">
      Redirecting…
    </div>
  );
}
