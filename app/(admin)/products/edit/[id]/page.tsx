"use client";

import { Suspense } from "react";
import EditProductInner from "./EditProductInner";
import { LoadingState } from "@/components/ui/States";

export default function EditProductPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <EditProductInner />
    </Suspense>
  );
}
  