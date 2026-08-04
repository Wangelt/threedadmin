"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getUser, isSuperAdminRole } from "@/lib/auth";
import type { Category, Location, Product, User } from "@/lib/types";
import { ProductForm } from "@/components/forms/ProductForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, LoadingState } from "@/components/ui/States";

function locationStockLabel(user: User | null, locations: Location[], locationId?: string) {
  if (isSuperAdminRole(user?.role)) {
    const loc = locations.find((l) => l._id === locationId);
    return loc ? `Stock at ${loc.code}` : "Stock at location";
  }
  if (typeof user?.location === "object" && user.location) {
    return `Stock at ${user.location.code}`;
  }
  return "Stock at your location";
}

function applyLocationStock(product: Product, locationId?: string): Product {
  if (!locationId) return product;
  return {
    ...product,
    variants: (product.variants || []).map((v) => {
      const row = (v.stockByLocation || []).find((s) => String(s.locationId) === locationId);
      return {
        ...v,
        totalStock: v.totalStock ?? v.stock,
        stock: row ? row.stock : 0,
      };
    }),
  };
}

export default function EditProductInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");

  const [user] = useState(() => getUser());
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockLocationId, setStockLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const catData = await api<{ categories: Category[] }>("/categories", {
          query: { all: "true" },
        });
        setCategories(catData.categories);

        if (isSuperAdminRole(user?.role)) {
          const locData = await api<{ locations: Location[] }>("/locations");
          setLocations(locData.locations);
          setStockLocationId(locData.locations[0]?._id || "");
        } else if (typeof user?.location === "object" && user.location) {
          setStockLocationId(user.location._id);
        }

        if (!slug) {
          throw new Error("Missing product slug. Open this page from the products list.");
        }
        const prodData = await api<{ product: Product }>(`/products/${slug}`);
        setProduct(prodData.product);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, slug, user?.role, user?.location]);

  const formProduct = useMemo(() => {
    if (!product) return null;
    if (isSuperAdminRole(user?.role) && stockLocationId) {
      return applyLocationStock(product, stockLocationId);
    }
    return product;
  }, [product, stockLocationId, user?.role]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!product || !formProduct) return <ErrorState message="Product not found" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Edit ${product.title}`}
        description="Update catalog details, variants, and product photos."
        actions={
          <Link href="/products" className="btn btn-secondary">
            Back
          </Link>
        }
      />

      {product.images?.length ? (
        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Current photos
            </p>
          </div>
          <div className="grid gap-0 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.images[0]}
              alt={product.title}
              className="max-h-[320px] w-full bg-[#f4f4f4] object-contain"
            />
            <div className="grid grid-cols-2 gap-2 p-3">
              {product.images.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-28 w-full border border-border object-cover"
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card flex min-h-28 items-center justify-center px-5 text-sm text-muted">
          No photos on this product yet — add them in the form below.
        </div>
      )}

      {message ? <p className="flash-ok mb-0 px-3 py-2 text-sm">{message}</p> : null}

      <div className="card p-5">
        <ProductForm
          key={`${product._id}-${stockLocationId}-${product.updatedAt || ""}`}
          categories={categories.filter((c) => c.isActive !== false)}
          initial={formProduct}
          submitLabel="Save changes"
          stockLabel={locationStockLabel(user, locations, stockLocationId)}
          locations={isSuperAdminRole(user?.role) ? locations : undefined}
          stockLocationId={stockLocationId || undefined}
          onStockLocationChange={
            isSuperAdminRole(user?.role) ? setStockLocationId : undefined
          }
          onSubmit={async (payload) => {
            const data = await api<{ product: Product }>(`/products/${params.id}`, {
              method: "PUT",
              body: payload,
            });
            setProduct(data.product);
            setMessage("Product updated.");
          }}
        />
      </div>
    </div>
  );
}
