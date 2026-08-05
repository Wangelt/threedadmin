"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, formatCurrency, formatDate, getErrorMessage } from "@/lib/api";
import { getUser, isSuperAdminRole } from "@/lib/auth";
import { userLabel } from "@/lib/format";
import type {
  Location,
  Order,
  OrderStatus,
  Pagination,
  PaymentStatus,
} from "@/lib/types";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { ThumbStack } from "@/components/ui/Thumb";
import { useToast } from "@/components/ui/Toast";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "payment_confirmed",
  "in_production",
  "quality_check",
  "shipped",
  "delivered",
  "cancelled",
  "refund_initiated",
  "refunded",
];

const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];

function orderLocationLabel(order: Order) {
  if (!order.location) return "—";
  if (typeof order.location === "string") return order.location;
  return `${order.location.name} (${order.location.code})`;
}

export default function OrdersPage() {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [isSuper] = useState(() => isSuperAdminRole(getUser()?.role));
  const [orders, setOrders] = useState<Order[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState("");

  async function openOrder(id: string) {
    if (openingId) return;
    setOpeningId(id);
    try {
      await api<{ order: Order }>(`/orders/${id}`);
      router.push(`/orders/${id}`);
    } catch (err) {
      toastError(getErrorMessage(err, "Failed to load order"));
    } finally {
      setOpeningId("");
    }
  }

  useEffect(() => {
    if (!isSuper) return;
    (async () => {
      try {
        const data = await api<{ locations: Location[] }>("/locations");
        setLocations(data.locations);
      } catch {
        // filter optional
      }
    })();
  }, [isSuper]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api<{ orders: Order[]; pagination: Pagination }>("/orders", {
          query: {
            page,
            limit: 20,
            orderStatus: orderStatus || undefined,
            paymentStatus: paymentStatus || undefined,
            locationId: isSuper ? locationId || undefined : undefined,
          },
        });
        if (cancelled) return;
        setOrders(data.orders);
        setPagination(data.pagination);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, orderStatus, paymentStatus, locationId, isSuper]);

  return (
    <div>
      <PageHeader
        title="Orders"
        description={
          isSuper
            ? "Filter by location and fulfillment status across the network."
            : "Orders assigned to your location."
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        {isSuper ? (
          <select
            className="field max-w-xs"
            value={locationId}
            onChange={(e) => {
              setPage(1);
              setLocationId(e.target.value);
            }}
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
        ) : null}
        <select
          className="field max-w-xs"
          value={orderStatus}
          onChange={(e) => {
            setPage(1);
            setOrderStatus(e.target.value);
          }}
        >
          <option value="">All order statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="field max-w-xs"
          value={paymentStatus}
          onChange={(e) => {
            setPage(1);
            setPaymentStatus(e.target.value);
          }}
        >
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map((s) => (
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
            rows={orders}
            rowKey={(o) => o._id}
            interactive
            columns={[
              {
                key: "orderId",
                header: "Order",
                render: (o) => (
                  <div className="flex items-center gap-3">
                    <ThumbStack
                      urls={o.items?.map((i) => i.image)}
                      size={40}
                      max={2}
                    />
                    <button
                      type="button"
                      className="font-semibold text-ink hover:underline disabled:opacity-50"
                      disabled={openingId === o._id}
                      onClick={() => openOrder(o._id)}
                    >
                      {openingId === o._id ? "Opening…" : o.orderId}
                    </button>
                  </div>
                ),
              },
              {
                key: "customer",
                header: "Customer",
                render: (o) => userLabel(typeof o.user === "object" ? o.user : undefined),
              },
              {
                key: "location",
                header: "Location",
                render: (o) => orderLocationLabel(o),
              },
              {
                key: "total",
                header: "Total",
                render: (o) => formatCurrency(o.total),
              },
              {
                key: "orderStatus",
                header: "Status",
                render: (o) => <StatusBadge status={o.orderStatus} />,
              },
              {
                key: "paymentStatus",
                header: "Payment",
                render: (o) => <StatusBadge status={o.paymentStatus} />,
              },
              {
                key: "createdAt",
                header: "Created",
                render: (o) => formatDate(o.createdAt),
              },
            ]}
          />

          {pagination && pagination.pages > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted">
                Page {pagination.page} of {pagination.pages} · {pagination.total} total
              </p>
              <div className="flex gap-2">
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
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
