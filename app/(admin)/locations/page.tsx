"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, formatDate } from "@/lib/api";
import { getUser, isSuperAdminRole } from "@/lib/auth";
import type { Location } from "@/lib/types";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/States";

const emptyForm = {
  name: "",
  code: "",
  city: "",
  address: "",
  isActive: true,
};

export default function LocationsPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!isSuperAdminRole(user?.role)) {
      router.replace("/dashboard");
      return;
    }
    setAllowed(true);
  }, [router]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ locations: Location[] }>("/locations", {
        query: { includeInactive: true },
      });
      setLocations(data.locations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!allowed) return;
    load();
  }, [allowed]);

  function startEdit(loc: Location) {
    setEditingId(loc._id);
    setForm({
      name: loc.name,
      code: loc.code,
      city: loc.city || "",
      address: loc.address || "",
      isActive: loc.isActive !== false,
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
      const payload = {
        name: form.name,
        code: form.code.toUpperCase(),
        city: form.city || null,
        address: form.address || null,
        isActive: form.isActive,
      };
      if (editingId) {
        await api(`/locations/${editingId}`, { method: "PATCH", body: payload });
      } else {
        await api("/locations", { method: "POST", body: payload });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) return <LoadingState label="Checking access…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Warehouses and shops that hold inventory and fulfill orders."
      />

      <form onSubmit={onSubmit} className="card grid gap-3 p-5 md:grid-cols-2">
        <h4 className="font-semibold md:col-span-2">
          {editingId ? "Edit location" : "New location"}
        </h4>
        <div>
          <label className="label">Name</label>
          <input
            className="field"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Code</label>
          <input
            className="field"
            required
            minLength={2}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            disabled={Boolean(editingId)}
          />
        </div>
        <div>
          <label className="label">City</label>
          <input
            className="field"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Address</label>
          <input
            className="field"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
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
            {saving ? "Saving…" : editingId ? "Update" : "Create location"}
          </button>
        </div>
      </form>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <DataTable
          rows={locations}
          rowKey={(l) => l._id}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (l) => <span className="font-semibold">{l.name}</span>,
            },
            { key: "code", header: "Code", render: (l) => l.code },
            { key: "city", header: "City", render: (l) => l.city || "—" },
            {
              key: "status",
              header: "Status",
              render: (l) => (
                <StatusBadge status={l.isActive !== false ? "active" : "inactive"} />
              ),
            },
            {
              key: "created",
              header: "Created",
              render: (l) => (l.createdAt ? formatDate(l.createdAt) : "—"),
            },
            {
              key: "actions",
              header: "",
              render: (l) => (
                <button type="button" className="btn btn-secondary" onClick={() => startEdit(l)}>
                  Edit
                </button>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
