"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewProductPage() {
  const router = useRouter();
  const [user] = useState(() => getUser());
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockLocationId, setStockLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ categories: Category[] }>("/categories", {
          query: { all: "true" },
        });
        setCategories(data.categories.filter((c) => c.isActive !== false));

        if (isSuperAdminRole(user?.role)) {
          const locData = await api<{ locations: Location[] }>("/locations");
          setLocations(locData.locations);
          setStockLocationId(locData.locations[0]?._id || "");
        } else if (typeof user?.location === "object" && user.location) {
          setStockLocationId(user.location._id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load categories");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.role, user?.location]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="New product"
        actions={
          <Link href="/products" className="btn btn-secondary">
            Back
          </Link>
        }
      />
      <div className="card p-5">
        <ProductForm
          categories={categories}
          submitLabel="Create product"
          stockLabel={locationStockLabel(user, locations, stockLocationId)}
          locations={isSuperAdminRole(user?.role) ? locations : undefined}
          stockLocationId={stockLocationId || undefined}
          onStockLocationChange={
            isSuperAdminRole(user?.role) ? setStockLocationId : undefined
          }
          onSubmit={async (payload) => {
            const data = await api<{ product: Product }>("/products", {
              method: "POST",
              body: payload,
            });
            router.push(
              `/products/edit/${data.product._id}?slug=${encodeURIComponent(data.product.slug)}`
            );
          }}
        />
      </div>
    </div>
  );
}
