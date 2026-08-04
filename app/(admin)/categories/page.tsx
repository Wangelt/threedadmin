"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Thumb } from "@/components/ui/Thumb";

const emptyForm = {
  name: "",
  description: "",
  image: "",
  sortOrder: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ categories: Category[] }>("/categories", {
        query: { all: "true" },
      });
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(category: Category) {
    setEditingId(category._id);
    setForm({
      name: category.name,
      description: category.description || "",
      image: category.image || "",
      sortOrder: category.sortOrder || 0,
      isActive: category.isActive !== false,
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
        description: form.description || null,
        image: form.image || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      if (editingId) {
        await api(`/categories/${editingId}`, { method: "PUT", body: payload });
      } else {
        await api("/categories", { method: "POST", body: payload });
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
    if (!confirm("Deactivate this category?")) return;
    try {
      await api(`/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize the product catalog."
      />

      <form onSubmit={onSubmit} className="card grid gap-3 p-5 md:grid-cols-2">
        <h4 className="md:col-span-2 font-semibold">
          {editingId ? "Edit category" : "New category"}
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
          <label className="label">Sort order</label>
          <input
            className="field"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Description</label>
          <textarea
            className="field min-h-20"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Image URL</label>
          <input
            className="field"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
          {form.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.image}
              alt=""
              className="mt-3 h-24 w-24 border border-border object-cover"
            />
          ) : null}
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
          rows={categories}
          rowKey={(c) => c._id}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (c) => (
                <div className="flex items-center gap-3">
                  <Thumb src={c.image} alt={c.name} size={44} rounded="none" />
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted">{c.slug}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "sort",
              header: "Sort",
              render: (c) => c.sortOrder ?? 0,
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
