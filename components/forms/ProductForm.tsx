"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { prepareImageForUpload } from "@/lib/imageUpload";
import { useToast } from "@/components/ui/Toast";
import type { Category, Location, Product, ProductVariant } from "@/lib/types";

type FormState = {
  title: string;
  description: string;
  shortDesc: string;
  category: string;
  tags: string;
  printTime: string;
  isCustomizable: boolean;
  isActive: boolean;
  isFeatured: boolean;
  variants: ProductVariant[];
};

type ImageItem = {
  id: string;
  preview: string;
  file?: File;
  remoteUrl?: string;
  name?: string;
  sizeLabel?: string;
};

type Props = {
  categories: Category[];
  initial?: Product;
  submitLabel: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  stockLabel?: string;
  locations?: Location[];
  stockLocationId?: string;
  onStockLocationChange?: (locationId: string) => void;
};

function emptyVariant(): ProductVariant {
  return { label: "Standard", price: 0, stock: 0, material: "", color: "", size: "", sku: "" };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toForm(product?: Product): FormState {
  return {
    title: product?.title || "",
    description: product?.description || "",
    shortDesc: product?.shortDesc || "",
    category:
      typeof product?.category === "object" && product?.category
        ? product.category._id
        : (product?.category as string) || "",
    tags: (product?.tags || []).join(", "),
    printTime: product?.printTime || "",
    isCustomizable: Boolean(product?.isCustomizable),
    isActive: product?.isActive !== false,
    isFeatured: Boolean(product?.isFeatured),
    variants: product?.variants?.length ? product.variants : [emptyVariant()],
  };
}

function initialImages(product?: Product): ImageItem[] {
  return (product?.images || []).map((url, index) => ({
    id: `remote-${index}-${url}`,
    preview: url,
    remoteUrl: url,
    name: `Image ${index + 1}`,
  }));
}

export function ProductForm({
  categories,
  initial,
  submitLabel,
  onSubmit,
  stockLabel = "Stock",
  locations,
  stockLocationId,
  onStockLocationChange,
}: Props) {
  const { success, error: toastError, info } = useToast();
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [images, setImages] = useState<ImageItem[]>(() => initialImages(initial));
  const [activeImage, setActiveImage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const active = images[Math.min(activeImage, Math.max(0, images.length - 1))];

  const pendingCount = useMemo(
    () => images.filter((img) => Boolean(img.file)).length,
    [images]
  );

  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.file && img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateVariant(index: number, patch: Partial<ProductVariant>) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError("");

    const incoming = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!incoming.length) {
      const msg = "Please choose image files (JPEG, PNG, WebP, or GIF).";
      setError(msg);
      toastError(msg);
      return;
    }

    const tooBig = incoming.find((file) => file.size > 10 * 1024 * 1024);
    if (tooBig) {
      const msg = `"${tooBig.name}" is larger than 10MB. Compress it or pick a smaller file.`;
      setError(msg);
      toastError(msg);
      return;
    }

    const room = Math.max(0, 5 - images.length);
    if (room === 0) {
      const msg = "Maximum 5 images allowed.";
      setError(msg);
      toastError(msg);
      return;
    }

    const accepted = incoming.slice(0, room);
    if (incoming.length > room) {
      const msg = `Only ${room} more image(s) can be added (max 5).`;
      setError(msg);
      toastError(msg);
    }

    const nextItems: ImageItem[] = accepted.map((file) => ({
      id: `local-${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      preview: URL.createObjectURL(file),
      file,
      name: file.name,
      sizeLabel: formatBytes(file.size),
    }));

    setImages((prev) => {
      const next = [...prev, ...nextItems];
      setActiveImage(next.length - 1);
      return next;
    });
    info(`${accepted.length} image(s) ready — they upload when you save.`);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const target = prev[index];
      if (target?.file && target.preview.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }
      const next = prev.filter((_, i) => i !== index);
      setActiveImage((current) => Math.min(current, Math.max(0, next.length - 1)));
      return next;
    });
  }

  async function uploadFile(file: File) {
    const prepared = await prepareImageForUpload(file);
    const fd = new FormData();
    fd.append("file", prepared);
    fd.append("folder", "products");
    const data = await api<{ file: { url: string; publicId?: string } }>("/uploads/image", {
      method: "POST",
      formData: fd,
    });
    if (!data.file?.url) {
      throw new Error(`Upload failed for ${file.name}`);
    }
    return data.file.url;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    try {
      const resolvedUrls: string[] = [];

      for (let i = 0; i < images.length; i += 1) {
        const item = images[i];
        if (item.remoteUrl && !item.file) {
          resolvedUrls.push(item.remoteUrl);
          continue;
        }
        if (!item.file) continue;

        const label = `Uploading image ${i + 1} of ${images.length}…`;
        setStatus(label);
        info(
          item.file && item.file.size > 2 * 1024 * 1024
            ? `${label} (compressing large file first)`
            : label
        );
        try {
          const url = await uploadFile(item.file);
          resolvedUrls.push(url);
        } catch (uploadErr) {
          const msg = getErrorMessage(
            uploadErr,
            `Failed to upload "${item.name || `image ${i + 1}`}"`
          );
          throw new Error(msg);
        }
      }

      setStatus("Saving product…");
      info("Saving product…");

      const tags = form.tags
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      await onSubmit({
        title: form.title,
        description: form.description,
        shortDesc: form.shortDesc || null,
        category: form.category,
        tags,
        images: resolvedUrls,
        printTime: form.printTime || null,
        isCustomizable: form.isCustomizable,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        ...(stockLocationId ? { locationId: stockLocationId } : {}),
        variants: form.variants.map((v) => ({
          ...(v._id ? { _id: v._id } : {}),
          label: v.label,
          material: v.material || null,
          color: v.color || null,
          size: v.size || null,
          price: Number(v.price) || 0,
          stock: Number(v.stock) || 0,
          sku: v.sku || null,
        })),
      });

      setStatus("");
      success("Product saved successfully.");
    } catch (err) {
      const msg = getErrorMessage(err, "Save failed");
      setError(msg);
      toastError(msg);
      setStatus("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Title</label>
          <input
            className="field"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Description</label>
          <textarea
            className="field min-h-28"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Short description</label>
          <input
            className="field"
            value={form.shortDesc}
            onChange={(e) => setForm({ ...form, shortDesc: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Category</label>
          <select
            className="field"
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tags (comma separated)</label>
          <input
            className="field"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Print time</label>
          <input
            className="field"
            value={form.printTime}
            onChange={(e) => setForm({ ...form, printTime: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3 border border-border bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="label mb-0">Product images</label>
            <p className="text-xs text-muted">
              Preview locally first. Files upload only when you save
              {pendingCount ? ` · ${pendingCount} pending` : ""}.
            </p>
          </div>
          <label className={`btn btn-secondary cursor-pointer ${saving ? "pointer-events-none opacity-50" : ""}`}>
            Add images
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={saving || images.length >= 5}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {images.length ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="flex min-h-[240px] items-center justify-center border border-border bg-[#f4f4f4] p-3">
              {active && !broken[active.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.preview}
                  alt={active.name || "Selected product"}
                  className="max-h-[360px] w-full object-contain"
                  onError={() => setBroken((prev) => ({ ...prev, [active.id]: true }))}
                />
              ) : (
                <div className="px-4 text-center text-sm text-muted">
                  <p className="font-semibold text-ink">{active?.name || "Image"}</p>
                  {active?.sizeLabel ? <p className="mt-1">{active.sizeLabel}</p> : null}
                  <p className="mt-2">Preview unavailable — file is still attached and will upload on save.</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                {images.map((item, index) => (
                  <div key={item.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`block w-full border p-0.5 ${
                        activeImage === index ? "border-black" : "border-border"
                      }`}
                    >
                      {!broken[item.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.preview}
                          alt=""
                          className="h-20 w-full bg-[#f4f4f4] object-cover"
                          onError={() => setBroken((prev) => ({ ...prev, [item.id]: true }))}
                        />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center bg-[#f4f4f4] px-1 text-center text-[10px] text-muted">
                          {item.name || "Image"}
                          {item.sizeLabel ? (
                            <>
                              <br />
                              {item.sizeLabel}
                            </>
                          ) : null}
                        </div>
                      )}
                    </button>
                    {item.file ? (
                      <span className="absolute left-1 top-1 bg-black px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                        New
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="absolute right-1 top-1 bg-black px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      onClick={() => removeImage(index)}
                      disabled={saving}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">
                {images.length}/5 images · click a thumb to preview
              </p>
            </div>
          </div>
        ) : (
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-[#f4f4f4] px-4 text-center text-sm text-muted hover:border-black">
            <span className="font-semibold text-ink">Choose product photos</span>
            <span>JPEG, PNG, WebP, or GIF · max 5 · up to 10MB each</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={saving}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
          />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isCustomizable}
            onChange={(e) => setForm({ ...form, isCustomizable: e.target.checked })}
          />
          Customizable
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-semibold">Variants</h4>
          <div className="flex flex-wrap items-center gap-2">
            {locations && locations.length > 0 && onStockLocationChange ? (
              <select
                className="field max-w-xs"
                value={stockLocationId || ""}
                onChange={(e) => onStockLocationChange(e.target.value)}
              >
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>
                    Stock location: {l.name} ({l.code})
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setForm({ ...form, variants: [...form.variants, emptyVariant()] })}
            >
              Add variant
            </button>
          </div>
        </div>
        {form.variants.map((variant, index) => (
          <div key={index} className="grid gap-3 border border-border p-4 md:grid-cols-3">
            <div>
              <label className="label">Label</label>
              <input
                className="field"
                required
                value={variant.label}
                onChange={(e) => updateVariant(index, { label: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Price</label>
              <input
                className="field"
                type="number"
                min={0}
                required
                value={variant.price}
                onChange={(e) => updateVariant(index, { price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">{stockLabel}</label>
              <input
                className="field"
                type="number"
                min={0}
                value={variant.stock}
                onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })}
              />
              {variant.totalStock != null ? (
                <p className="mt-1 text-[11px] text-muted">
                  Total across locations: {variant.totalStock}
                </p>
              ) : null}
            </div>
            <div>
              <label className="label">Material</label>
              <input
                className="field"
                value={variant.material || ""}
                onChange={(e) => updateVariant(index, { material: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Color</label>
              <input
                className="field"
                value={variant.color || ""}
                onChange={(e) => updateVariant(index, { color: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Size</label>
              <input
                className="field"
                value={variant.size || ""}
                onChange={(e) => updateVariant(index, { size: e.target.value })}
              />
            </div>
            {form.variants.length > 1 ? (
              <button
                type="button"
                className="btn btn-danger md:col-span-3"
                onClick={() =>
                  setForm({
                    ...form,
                    variants: form.variants.filter((_, i) => i !== index),
                  })
                }
              >
                Remove variant
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {status ? <p className="flash-ok px-3 py-2 text-sm">{status}</p> : null}
      {error ? <p className="flash-err px-3 py-2 text-sm">{error}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? status || "Saving…" : submitLabel}
      </button>
    </form>
  );
}
