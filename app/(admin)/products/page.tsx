"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, formatCurrency, getErrorMessage } from "@/lib/api";
import type { Pagination, Product } from "@/lib/types";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Thumb } from "@/components/ui/Thumb";
import { useToast } from "@/components/ui/Toast";

export default function ProductsPage() {
  const { error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load(nextPage = page, query = appliedQ) {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ products: Product[]; pagination: Pagination }>("/products", {
        query: { page: nextPage, limit: 20, q: query || undefined },
      });
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const trimmed = q.trim();
    const timer = window.setTimeout(() => {
      if (trimmed.length > 0 && trimmed.length < 3) return;
      const next = trimmed.length >= 3 ? trimmed : "";
      setPage(1);
      setAppliedQ(next);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    load(page, appliedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedQ]);

  async function deactivate(id: string) {
    if (!confirm("Deactivate this product?")) return;
    setBusyId(id);
    try {
      await api(`/products/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      toastError(getErrorMessage(err, "Delete failed"));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Create and manage catalog products."
        actions={
          <Link href="/products/new" className="btn btn-primary">
            New product
          </Link>
        }
      />

      <div className="mb-4">
        <input
          className="field !h-9 max-w-md !py-0 text-sm"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          <DataTable
            rows={products}
            rowKey={(p) => p._id}
            columns={[
              {
                key: "title",
                header: "Product",
                render: (p) => (
                  <div className="flex items-center gap-3">
                    <Thumb src={p.images?.[0]} alt={p.title} size={48} rounded="none" />
                    <div>
                      <Link
                        href={`/products/edit/${p._id}?slug=${encodeURIComponent(p.slug)}`}
                        className="font-semibold text-ink hover:underline"
                      >
                        {p.title}
                      </Link>
                      <p className="text-xs text-muted">{p.slug}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: "price",
                header: "From",
                render: (p) => formatCurrency(p.variants?.[0]?.price || 0),
              },
              {
                key: "stock",
                header: "Stock",
                render: (p) =>
                  p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0,
              },
              {
                key: "featured",
                header: "Featured",
                render: (p) => (
                  <StatusBadge status={p.isFeatured ? "active" : "inactive"} />
                ),
              },
              {
                key: "actions",
                header: "",
                render: (p) => (
                  <div className="flex gap-2">
                    <Link
                      href={`/products/edit/${p._id}?slug=${encodeURIComponent(p.slug)}`}
                      className="btn btn-secondary"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={busyId === p._id}
                      onClick={() => deactivate(p._id)}
                    >
                      Deactivate
                    </button>
                  </div>
                ),
              },
            ]}
          />
          {pagination && pagination.pages > 1 ? (
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
