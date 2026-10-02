"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, formatDate, getErrorMessage } from "@/lib/api";
import { getUser, isSuperAdminRole } from "@/lib/auth";
import type { Location, Pagination, User } from "@/lib/types";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  locationId: "",
};

function locationLabel(user: User) {
  if (!user.location) return "—";
  if (typeof user.location === "string") return user.location;
  return `${user.location.name} (${user.location.code})`;
}

export default function AdminsPage() {
  const router = useRouter();
  const { error: toastError } = useToast();
  const [allowed, setAllowed] = useState(false);
  const [admins, setAdmins] = useState<User[]>([]);
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
      const [adminData, locData] = await Promise.all([
        api<{ users: User[]; pagination: Pagination }>("/admin-users", {
          query: { page: 1, limit: 50 },
        }),
        api<{ locations: Location[] }>("/locations", {
          query: { includeInactive: false },
        }),
      ]);
      setAdmins(adminData.users);
      setLocations(locData.locations);
      if (!form.locationId && locData.locations[0]) {
        setForm((f) => ({ ...f, locationId: locData.locations[0]._id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!allowed) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  function startEdit(admin: User) {
    setEditingId(admin._id);
    const locId =
      typeof admin.location === "object" && admin.location
        ? admin.location._id
        : typeof admin.location === "string"
          ? admin.location
          : "";
    setForm({
      name: admin.name,
      email: admin.email,
      password: "",
      locationId: locId,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      locationId: locations[0]?._id || "",
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await api(`/admin-users/${editingId}`, {
          method: "PATCH",
          body: {
            name: form.name,
            email: form.email,
            locationId: form.locationId,
          },
        });
      } else {
        await api("/admin-users", {
          method: "POST",
          body: {
            name: form.name,
            email: form.email,
            password: form.password,
            locationId: form.locationId,
          },
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleBlock(admin: User) {
    const next = !admin.isBlocked;
    const label = next ? "Block" : "Unblock";
    if (!confirm(`${label} ${admin.name}?`)) return;
    try {
      await api(`/admin-users/${admin._id}/block`, {
        method: "PATCH",
        body: { isBlocked: next },
      });
      await load();
    } catch (err) {
      toastError(getErrorMessage(err, `${label} failed`));
    }
  }

  if (!allowed) return <LoadingState label="Checking access…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admins"
        description="Create admins and assign each one to a fulfillment location."
      />

      <form onSubmit={onSubmit} className="card grid gap-3 p-5 md:grid-cols-2">
        <h4 className="font-semibold md:col-span-2">
          {editingId ? "Edit admin" : "New admin"}
        </h4>
        <div>
          <label className="label">Name</label>
          <input
            className="field"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="field"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Location</label>
          <select
            className="field"
            required
            value={form.locationId}
            onChange={(e) => setForm({ ...form, locationId: e.target.value })}
          >
            <option value="">Select location</option>
            {locations.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
        </div>
        {!editingId ? (
          <div>
            <label className="label">Password</label>
            <input
              className="field"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
            />
          </div>
        ) : null}
        <div className="flex gap-2 md:col-span-2 md:justify-end">
          {editingId ? (
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : editingId ? "Update" : "Create admin"}
          </button>
        </div>
      </form>

      {loading ? <LoadingState label="Loading admins…" /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <DataTable
          rows={admins}
          rowKey={(a) => a._id}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (a) => <span className="font-semibold">{a.name}</span>,
            },
            { key: "email", header: "Email", render: (a) => a.email },
            {
              key: "location",
              header: "Location",
              render: (a) => locationLabel(a),
            },
            {
              key: "status",
              header: "Status",
              render: (a) => (
                <StatusBadge status={a.isBlocked ? "inactive" : "active"} />
              ),
            },
            {
              key: "created",
              header: "Created",
              render: (a) => (a.createdAt ? formatDate(a.createdAt) : "—"),
            },
            {
              key: "actions",
              header: "",
              render: (a) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => startEdit(a)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={a.isBlocked ? "btn btn-primary" : "btn btn-danger"}
                    onClick={() => toggleBlock(a)}
                  >
                    {a.isBlocked ? "Unblock" : "Block"}
                  </button>
                </div>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
