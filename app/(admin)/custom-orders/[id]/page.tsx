"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { userLabel } from "@/lib/format";
import type { CustomOrder, CustomOrderStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/States";

const STATUSES: CustomOrderStatus[] = [
  "pending_review",
  "quoted",
  "accepted",
  "rejected",
  "in_production",
  "shipped",
  "delivered",
];

export default function CustomOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<CustomOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState<CustomOrderStatus>("pending_review");
  const [amount, setAmount] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ request: CustomOrder }>(`/custom-orders/${params.id}`);
      setRequest(data.request);
      setStatus(data.request.status);
      setAmount(
        data.request.quote?.amount != null ? String(data.request.quote.amount) : ""
      );
      setEstimatedDays(
        data.request.quote?.estimatedDays != null
          ? String(data.request.quote.estimatedDays)
          : ""
      );
      setAdminNote(data.request.quote?.adminNote || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load request");
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
    setError("");
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        status,
        note: note || null,
      };
      if (status === "quoted") {
        body.quote = {
          amount: Number(amount),
          estimatedDays: Number(estimatedDays),
          adminNote: adminNote || null,
        };
      }
      const data = await api<{ request: CustomOrder }>(
        `/custom-orders/${params.id}/status`,
        { method: "PUT", body }
      );
      setRequest(data.request);
      setMessage("Custom order updated.");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error && !request) return <ErrorState message={error} />;
  if (!request) return <ErrorState message="Request not found" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.requestId}
        description={`Submitted ${formatDate(request.createdAt)}`}
        actions={
          <Link href="/custom-orders" className="btn btn-secondary">
            Back
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-4 p-5 lg:col-span-2">
          <StatusBadge status={request.status} />
          <p className="text-sm text-muted">
            Customer:{" "}
            <span className="font-medium text-foreground">
              {userLabel(typeof request.user === "object" ? request.user : undefined)}
            </span>
          </p>
          <div>
            <h4 className="font-semibold">Description</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm">{request.description}</p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>Qty: {request.quantity}</p>
            <p>Material: {request.preferredMaterial || "—"}</p>
            <p>Color: {request.preferredColor || "—"}</p>
            <p>Contact: {request.preferredContact || "—"}</p>
            <p>
              Budget:{" "}
              {request.budgetRange?.min != null || request.budgetRange?.max != null
                ? `${formatCurrency(request.budgetRange?.min || 0)} – ${formatCurrency(
                    request.budgetRange?.max || 0
                  )}`
                : "—"}
            </p>
            <p>Deadline: {request.deadlinePreference || "—"}</p>
          </div>
          {request.additionalNotes ? (
            <p className="text-sm text-muted">{request.additionalNotes}</p>
          ) : null}
          {request.referenceImages?.length ? (
            <div className="flex flex-wrap gap-2">
              {request.referenceImages.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Reference" className="h-24 w-24 object-cover" />
                </a>
              ))}
            </div>
          ) : null}
          {request.quote?.amount != null ? (
            <div className="border border-border bg-[#f4f4f4] p-4 text-sm">
              <p className="font-semibold text-ink">Current quote</p>
              <p>
                {formatCurrency(request.quote.amount)} · {request.quote.estimatedDays} days
              </p>
              {request.quote.adminNote ? <p className="mt-1">{request.quote.adminNote}</p> : null}
            </div>
          ) : null}
          {request.timeline?.length ? (
            <div>
              <h4 className="mb-2 font-semibold">Timeline</h4>
              <ul className="space-y-2">
                {request.timeline.map((event, idx) => (
                  <li key={idx} className="rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={event.status} />
                      <span className="text-xs text-muted">{formatDate(event.at)}</span>
                    </div>
                    {(event.note || event.message) && (
                      <p className="mt-1 text-muted">{event.note || event.message}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="card space-y-3 p-5">
          <h4 className="font-semibold">Update status</h4>
          <div>
            <label className="label">Status</label>
            <select
              className="field"
              value={status}
              onChange={(e) => setStatus(e.target.value as CustomOrderStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {status === "quoted" ? (
            <>
              <div>
                <label className="label">Quote amount</label>
                <input
                  className="field"
                  type="number"
                  min={0}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Estimated days</label>
                <input
                  className="field"
                  type="number"
                  min={1}
                  required
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Admin note</label>
                <textarea
                  className="field min-h-20"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>
            </>
          ) : null}
          <div>
            <label className="label">Timeline note</label>
            <textarea
              className="field min-h-20"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error ? <p className="flash-err px-3 py-2 text-sm">{error}</p> : null}
          {message ? <p className="flash-ok px-3 py-2 text-sm">{message}</p> : null}
          <button type="submit" className="btn btn-primary w-full" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
