"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { userLabel } from "@/lib/format";
import type { CustomOrder, CustomOrderStatus, Pagination } from "@/lib/types";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Thumb } from "@/components/ui/Thumb";

const STATUSES: CustomOrderStatus[] = [
  "pending_review",
  "quoted",
  "accepted",
  "rejected",
  "in_production",
  "shipped",
  "delivered",
];

export default function CustomOrdersPage() {
  const [requests, setRequests] = useState<CustomOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api<{ requests: CustomOrder[]; pagination: Pagination }>(
          "/custom-orders",
          {
            query: {
              page,
              limit: 20,
              status: status || undefined,
            },
          }
        );
        if (cancelled) return;
        setRequests(data.requests);
        setPagination(data.pagination);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load custom orders");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  return (
    <div>
      <PageHeader
        title="Custom Orders"
        description="Review requests, send quotes, and track production."
      />

      <div className="mb-4">
        <select
          className="field max-w-xs"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          <DataTable
            rows={requests}
            rowKey={(r) => r._id}
            columns={[
              {
                key: "id",
                header: "Request",
                render: (r) => (
                  <div className="flex items-center gap-3">
                    <Thumb src={r.referenceImages?.[0]} alt="" size={44} rounded="none" />
                    <Link
                      href={`/custom-orders/${r._id}`}
                      className="font-semibold text-ink hover:underline"
                    >
                      {r.requestId}
                    </Link>
                  </div>
                ),
              },
              {
                key: "customer",
                header: "Customer",
                render: (r) => userLabel(typeof r.user === "object" ? r.user : undefined),
              },
              {
                key: "qty",
                header: "Qty",
                render: (r) => r.quantity,
              },
              {
                key: "quote",
                header: "Quote",
                render: (r) =>
                  r.quote?.amount != null ? formatCurrency(r.quote.amount) : "—",
              },
              {
                key: "status",
                header: "Status",
                render: (r) => <StatusBadge status={r.status} />,
              },
              {
                key: "created",
                header: "Created",
                render: (r) => formatDate(r.createdAt),
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
