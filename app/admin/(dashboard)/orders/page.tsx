"use client";

import { useState, useEffect } from "react";

type Order = {
  id: number;
  customerEmail: string;
  recipientName: string | null;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  itemCount: number;
  createdAt: string;
};

function statusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
    case "SHIPPED":
      return { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" };
    case "DELIVERED":
      return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
    case "CANCELLED":
      return { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" };
    default:
      return { bg: "bg-charcoal/10", text: "text-charcoal/60", dot: "bg-charcoal/40" };
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load orders.");
      setOrders(data.orders);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Unable to update order status.");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <h1 className="font-body text-2xl font-medium text-charcoal mb-1">
        Orders
      </h1>
      <p className="font-body text-sm text-charcoal/60 mb-8">
        {isLoading ? "Loading..." : `${orders.length} orders total`}
      </p>

      {errorMessage && (
        <p className="font-body text-sm text-red-600 mb-4">{errorMessage}</p>
      )}

      <div className="bg-white border border-charcoal/10 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead>
            <tr className="border-b border-charcoal/10">
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Order
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Customer
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Items
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Total
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Date
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const badge = statusBadge(order.status);
              return (
                <tr
                  key={order.id}
                  className="border-b border-charcoal/5 last:border-0 hover:bg-sand/20 transition-colors"
                >
                  <td className="px-5 py-3">
                    <span className="font-body text-sm text-charcoal">
                      TA-{order.id}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-body text-sm text-charcoal">
                      {order.recipientName || "—"}
                    </p>
                    <p className="font-body text-xs text-charcoal/50">
                      {order.customerEmail}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-body text-sm text-charcoal/70">
                      {order.itemCount}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-body text-sm text-charcoal/70">
                      ₱{order.totalAmount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-body text-xs text-charcoal/50">
                      {new Date(order.createdAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`font-body text-xs px-3 py-1.5 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-sage disabled:opacity-50 ${badge.bg} ${badge.text}`}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </td>
                </tr>
              );
            })}

            {!isLoading && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center">
                  <span className="font-body text-sm text-charcoal/40">
                    No orders yet.
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}