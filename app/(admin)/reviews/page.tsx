"use client";

import { useEffect, useState } from "react";
import { api, formatDate, getErrorMessage } from "@/lib/api";
import { userLabel } from "@/lib/format";
import type { Pagination, Product, Review } from "@/lib/types";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

export default function ReviewsPage() {
  const { error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      try {
        const data = await api<{ products: Product[]; pagination: Pagination }>("/products", {
          query: { limit: 100, page: 1 },
        });
        setProducts(data.products);
        if (data.products[0]) setProductId(data.products[0]._id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!productId) {
      setReviews([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingReviews(true);
      setError("");
      try {
        const data = await api<{ reviews: Review[]; pagination: Pagination }>(
          `/reviews/product/${productId}`,
          { query: { limit: 50, page: 1 }, auth: false }
        );
        if (!cancelled) setReviews(data.reviews);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load reviews");
          setReviews([]);
        }
      } finally {
        if (!cancelled) setLoadingReviews(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function hideReview(id: string) {
    if (!confirm("Hide this review?")) return;
    setBusyId(id);
    try {
      await api(`/reviews/${id}`, { method: "DELETE" });
      setReviews((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      toastError(getErrorMessage(err, "Failed to hide review"));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Select a product to moderate its public reviews."
      />

      {loadingProducts ? <LoadingState label="Loading products…" /> : null}

      {!loadingProducts ? (
        <div className="mb-4 max-w-xl">
          <label className="label">Product</label>
          <select
            className="field"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {!products.length ? <option value="">No products</option> : null}
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? <ErrorState message={error} /> : null}
      {loadingReviews ? <LoadingState label="Loading reviews…" /> : null}

      {!loadingReviews && productId ? (
        <DataTable
          rows={reviews}
          rowKey={(r) => r._id}
          empty="No reviews for this product."
          columns={[
            {
              key: "rating",
              header: "Rating",
              render: (r) => `${r.rating}/5`,
            },
            {
              key: "user",
              header: "User",
              render: (r) => userLabel(typeof r.user === "object" ? r.user : undefined),
            },
            {
              key: "comment",
              header: "Review",
              render: (r) => (
                <div>
                  {r.title ? <p className="font-medium">{r.title}</p> : null}
                  <p className="text-sm text-muted">{r.comment || "—"}</p>
                </div>
              ),
            },
            {
              key: "created",
              header: "Date",
              render: (r) => formatDate(r.createdAt),
            },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busyId === r._id}
                  onClick={() => hideReview(r._id)}
                >
                  Hide
                </button>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
