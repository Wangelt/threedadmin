"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, formatCurrency, formatDate, getErrorMessage } from "@/lib/api";
import { userLabel } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/States";
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

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { error: toastError } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [orderStatus, setOrderStatus] = useState<OrderStatus>("pending");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [logisticsPartner, setLogisticsPartner] = useState("");
  const [logisticsTrackingUrl, setLogisticsTrackingUrl] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ order: Order }>(`/orders/${params.id}`);
      setOrder(data.order);
      setOrderStatus(data.order.orderStatus);
      setTrackingNumber(data.order.trackingNumber || "");
      setLogisticsPartner(data.order.logisticsPartner || "");
      setLogisticsTrackingUrl(data.order.logisticsTrackingUrl || "");
      setEstimatedDelivery(
        data.order.estimatedDelivery
          ? data.order.estimatedDelivery.slice(0, 10)
          : ""
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load order"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const data = await api<{ order: Order }>(`/orders/${params.id}/status`, {
        method: "PUT",
        body: {
          orderStatus,
          trackingNumber: trackingNumber || null,
          logisticsPartner: logisticsPartner || null,
          logisticsTrackingUrl: logisticsTrackingUrl || null,
          estimatedDelivery: estimatedDelivery || null,
          message: note || null,
        },
      });
      setOrder(data.order);
      setMessage("Order status updated.");
      setNote("");
    } catch (err) {
      const msg = getErrorMessage(err, "Update failed");
      setError(msg);
      toastError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error && !order) return <ErrorState message={error} />;
  if (!order) return <ErrorState message="Order not found" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.orderId}
        description={`Placed ${formatDate(order.createdAt)}`}
        actions={
          <Link href="/orders" className="btn btn-secondary">
            Back to orders
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-3 p-5 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={order.orderStatus} />
            <StatusBadge status={order.paymentStatus} />
          </div>
          <p className="text-sm text-muted">
            Customer:{" "}
            <span className="font-medium text-foreground">
              {userLabel(typeof order.user === "object" ? order.user : undefined)}
            </span>
          </p>
          <p className="text-sm text-muted">
            Payment: {order.paymentMethod} · Total {formatCurrency(order.total)}
          </p>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Qty</th>
                  <th className="px-3 py-2 text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={item._id || idx} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt=""
                            className="h-12 w-12 border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center border border-border bg-[#f4f4f4] text-[10px] text-muted">
                            —
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-muted">{item.variantLabel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{formatCurrency(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="mb-2 font-semibold">Shipping</h4>
            <p className="text-sm">
              {order.shippingAddress.fullName} · {order.shippingAddress.phone}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.pincode}
            </p>
          </div>

          {order.timeline?.length ? (
            <div>
              <h4 className="mb-2 font-semibold">Timeline</h4>
              <ul className="space-y-2">
                {order.timeline.map((event, idx) => (
                  <li key={idx} className="rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={event.status} />
                      <span className="text-xs text-muted">{formatDate(event.at)}</span>
                    </div>
                    {event.message ? <p className="mt-1 text-muted">{event.message}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="card space-y-3 p-5">
          <h4 className="font-semibold">Update status</h4>
          <div>
            <label className="label">Order status</label>
            <select
              className="field"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tracking number</label>
            <input
              className="field"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Logistics partner</label>
            <input
              className="field"
              value={logisticsPartner}
              onChange={(e) => setLogisticsPartner(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Tracking URL</label>
            <input
              className="field"
              type="url"
              value={logisticsTrackingUrl}
              onChange={(e) => setLogisticsTrackingUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Estimated delivery</label>
            <input
              className="field"
              type="date"
              value={estimatedDelivery}
              onChange={(e) => setEstimatedDelivery(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              className="field min-h-20"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error ? <p className="flash-err px-3 py-2 text-sm">{error}</p> : null}
          {message ? <p className="flash-ok px-3 py-2 text-sm">{message}</p> : null}
          <button type="submit" className="btn btn-primary w-full" disabled={saving}>
            {saving ? "Saving…" : "Save status"}
          </button>
        </form>
      </div>
    </div>
  );
}
