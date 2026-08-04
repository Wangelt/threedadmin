"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, formatCurrency, formatDate } from "@/lib/api";
import type { Coupon } from "@/lib/types";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/States";

const emptyForm = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "flat",
  discountValue: 10,
  maxDiscount: "",
  minOrderValue: 0,
  expiresAt: "",
  usageLimit: "",
  usageLimitPerUser: 1,
  isActive: true,
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ coupons: Coupon[] }>("/coupons");
      setCoupons(data.coupons);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(coupon: Coupon) {
    setEditingId(coupon._id);
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : "",
      minOrderValue: coupon.minOrderValue || 0,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : "",
      usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
      usageLimitPerUser: coupon.usageLimitPerUser || 1,
      isActive: coupon.isActive !== false,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        code: form.code.toUpperCase(),
        description: form.description || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderValue: Number(form.minOrderValue) || 0,
        expiresAt: form.expiresAt,
        usageLimitPerUser: Number(form.usageLimitPerUser) || 1,
        isActive: form.isActive,
        applicableTo: { type: "all", categories: [], products: [] },
      };
      if (form.maxDiscount !== "") payload.maxDiscount = Number(form.maxDiscount);
      if (form.usageLimit !== "") payload.usageLimit = Number(form.usageLimit);
      else payload.usageLimit = null;

      if (editingId) {
        await api(`/coupons/${editingId}`, { method: "PUT", body: payload });
      } else {
        await api("/coupons", { method: "POST", body: payload });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this coupon?")) return;
    try {
      await api(`/coupons/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Coupons" description="Create and manage discount codes." />

      <form onSubmit={onSubmit} className="card grid gap-3 p-5 md:grid-cols-2">
        <h4 className="font-semibold md:col-span-2">
          {editingId ? "Edit coupon" : "New coupon"}
        </h4>
        <div>
          <label className="label">Code</label>
          <input
            className="field"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            disabled={Boolean(editingId)}
          />
        </div>
        <div>
          <label className="label">Expires</label>
          <input
            className="field"
            type="date"
            required={!editingId}
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Discount type</label>
          <select
            className="field"
            value={form.discountType}
            onChange={(e) =>
              setForm({ ...form, discountType: e.target.value as "percentage" | "flat" })
            }
          >
            <option value="percentage">Percentage</option>
            <option value="flat">Flat</option>
          </select>
        </div>
        <div>
          <label className="label">Discount value</label>
          <input
            className="field"
            type="number"
            min={0}
            required
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Max discount</label>
          <input
            className="field"
            type="number"
            min={0}
            value={form.maxDiscount}
            onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Min order value</label>
          <input
            className="field"
            type="number"
            min={0}
            value={form.minOrderValue}
            onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Usage limit</label>
          <input
            className="field"
            type="number"
            min={1}
            value={form.usageLimit}
            onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Per-user limit</label>
          <input
            className="field"
            type="number"
            min={1}
            value={form.usageLimitPerUser}
            onChange={(e) => setForm({ ...form, usageLimitPerUser: Number(e.target.value) })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Description</label>
          <input
            className="field"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Active
        </label>
        <div className="flex gap-2 md:justify-end">
          {editingId ? (
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : editingId ? "Update" : "Create"}
          </button>
        </div>
      </form>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <DataTable
          rows={coupons}
          rowKey={(c) => c._id}
          columns={[
            {
              key: "code",
              header: "Code",
              render: (c) => <span className="font-semibold">{c.code}</span>,
            },
            {
              key: "discount",
              header: "Discount",
              render: (c) =>
                c.discountType === "percentage"
                  ? `${c.discountValue}%`
                  : formatCurrency(c.discountValue),
            },
            {
              key: "expires",
              header: "Expires",
              render: (c) => formatDate(c.expiresAt),
            },
            {
              key: "status",
              header: "Status",
              render: (c) => (
                <StatusBadge status={c.isActive ? "active" : "inactive"} />
              ),
            },
            {
              key: "actions",
              header: "",
              render: (c) => (
                <div className="flex gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => startEdit(c)}>
                    Edit
                  </button>
                  {c.isActive ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => deactivate(c._id)}
                    >
                      Deactivate
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
