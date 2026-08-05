"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IndianRupee,
  Package,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { titleCase, userLabel } from "@/lib/format";
import type { CustomOrder, Order, Pagination, Product } from "@/lib/types";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Thumb } from "@/components/ui/Thumb";
import Link from "next/link";

const PIE_COLORS = ["#0a0a0a", "#404040", "#737373", "#a3a3a3", "#d4d4d4", "#e5e5e5"];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [orderData, productData, customData] = await Promise.all([
          api<{ orders: Order[]; pagination: Pagination }>("/orders", {
            query: { limit: 100, page: 1 },
          }),
          api<{ products: Product[]; pagination: Pagination }>("/products", {
            query: { limit: 100, page: 1 },
          }),
          api<{ requests: CustomOrder[]; pagination: Pagination }>("/custom-orders", {
            query: { limit: 20, page: 1 },
          }),
        ]);
        if (cancelled) return;
        setOrders(orderData.orders);
        setProducts(productData.products);
        setCustomOrders(customData.requests);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const activeOrders = orders.filter((o) => o.orderStatus !== "cancelled");
    const revenue = activeOrders
      .filter((o) => o.paymentStatus === "paid" || o.paymentMethod === "cod")
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const statusMap = new Map<string, number>();
    orders.forEach((o) => {
      statusMap.set(o.orderStatus, (statusMap.get(o.orderStatus) || 0) + 1);
    });

    const byDay = new Map<string, number>();
    [...orders]
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .forEach((o) => {
        const key = new Date(o.createdAt).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        });
        byDay.set(key, (byDay.get(key) || 0) + o.total);
      });

    let lowStock = 0;
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if ((v.stock ?? 0) <= 5) lowStock += 1;
      });
    });

    const pendingCustom = customOrders.filter((c) =>
      ["pending_review", "quoted"].includes(c.status)
    ).length;

    return {
      orderCount: orders.length,
      revenue,
      pendingCustom,
      lowStock,
      statusChart: [...statusMap.entries()].map(([name, value]) => ({
        name: titleCase(name),
        value,
      })),
      salesChart: [...byDay.entries()].slice(-10).map(([name, total]) => ({
        name,
        total,
      })),
    };
  }, [orders, products, customOrders]);

  const activity = useMemo(() => {
    const orderActivity = orders.slice(0, 5).map((o) => ({
      id: o._id,
      title: `Order ${o.orderId}`,
      meta: `${userLabel(typeof o.user === "object" ? o.user : undefined)} • ${formatDate(o.createdAt)}`,
      status: o.orderStatus,
      href: `/orders/${o._id}`,
      image: o.items?.[0]?.image,
    }));
    const customActivity = customOrders.slice(0, 3).map((c) => ({
      id: c._id,
      title: `Custom ${c.requestId}`,
      meta: `${userLabel(typeof c.user === "object" ? c.user : undefined)} • ${formatDate(c.createdAt)}`,
      status: c.status,
      href: `/custom-orders/${c._id}`,
      image: c.referenceImages?.[0],
    }));
    return [...orderActivity, ...customActivity].slice(0, 8);
  }, [orders, customOrders]);

  if (loading) return <LoadingState label="Loading floor overview…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          className="rise-in"
          title="Orders"
          value={String(stats.orderCount)}
          hint="Latest 100 pulled from the desk"
          icon={ShoppingBag}
        />
        <StatCard
          className="rise-in rise-in-delay-1"
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          hint="Paid + COD totals"
          icon={IndianRupee}
        />
        <StatCard
          className="rise-in rise-in-delay-2"
          title="Custom pipeline"
          value={String(stats.pendingCustom)}
          hint="Pending review or quoted"
          icon={Wrench}
        />
        <StatCard
          className="rise-in rise-in-delay-3"
          title="Low stock"
          value={String(stats.lowStock)}
          hint="Variants at 5 units or less"
          icon={Package}
        />
      </div>

      {products.length ? (
        <div className="card rise-in rise-in-delay-4 p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-ink">On the shelf</h3>
              <p className="text-sm text-muted">Live catalog thumbnails</p>
            </div>
            <Link href="/products" className="text-sm font-semibold text-ink underline-offset-2 hover:underline">
              Manage products
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {products.slice(0, 6).map((p) => (
              <Link
                key={p._id}
                href={`/products/edit/${p._id}?slug=${encodeURIComponent(p.slug)}`}
                className="group border border-border bg-white p-2 shadow-[0_4px_16px_rgba(10,10,10,0.12)] transition-[transform,box-shadow] duration-1000 ease-in-out will-change-transform hover:-translate-y-1.5 hover:shadow-[0_10px_28px_rgba(10,10,10,0.26)]"
              >
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="h-28 w-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-full items-center justify-center border border-border bg-[#f4f4f4] text-xs text-muted">
                    No image
                  </div>
                )}
                <p className="mt-2 truncate text-sm font-semibold group-hover:underline">
                  {p.title}
                </p>
                <p className="text-xs text-muted">{formatCurrency(p.variants?.[0]?.price || 0)}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-display mb-4 text-2xl text-ink">Sales by day</h3>
          <div className="h-72">
            {stats.salesChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.salesChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#737373" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#737373" }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
                  <Bar dataKey="total" fill="#0a0a0a" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                No order data yet
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-display mb-4 text-2xl text-ink">Status mix</h3>
          <div className="h-72">
            {stats.statusChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {stats.statusChart.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                No status data yet
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl text-ink">Recent desk activity</h3>
          <Link href="/orders" className="text-sm font-semibold text-ink underline-offset-2 hover:underline">
            View orders
          </Link>
        </div>
        <div className="space-y-2">
          {activity.length ? (
            activity.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between gap-3 border border-border bg-white px-3 py-2.5 shadow-none transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-x-[3px] hover:-translate-y-[3px] hover:!bg-[#eeeeee] hover:shadow-[3px_3px_0_#0a0a0a]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Thumb src={item.image} alt="" size={42} rounded="none" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="truncate text-xs text-muted">{item.meta}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}
