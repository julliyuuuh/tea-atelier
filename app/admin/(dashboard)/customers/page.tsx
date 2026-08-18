"use client";

import { useState, useEffect } from "react";

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isVerified: boolean;
  orderCount: number;
  totalSpent: number;
  joinedAt: string;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("/api/admin/customers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load customers.");
        setCustomers(data.customers);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    }
    loadCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <h1 className="font-body text-2xl font-medium text-charcoal mb-1">
        Customers
      </h1>
      <p className="font-body text-sm text-charcoal/60 mb-8">
        {isLoading ? "Loading..." : `${customers.length} customers total`}
      </p>

      {errorMessage && (
        <p className="font-body text-sm text-red-600 mb-4">{errorMessage}</p>
      )}

      <input
        type="text"
        placeholder="Search customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-full border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal mb-6 focus:outline-none focus:border-sage transition-colors"
      />

      <div className="bg-white border border-charcoal/10 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[680px]">
          <thead>
            <tr className="border-b border-charcoal/10">
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Customer
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Phone
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Orders
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Total Spent
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Joined
              </th>
              <th className="font-body text-xs uppercase tracking-wide text-charcoal/50 px-5 py-3">
                Verified
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-charcoal/5 last:border-0 hover:bg-sand/20 transition-colors"
              >
                <td className="px-5 py-3">
                  <p className="font-body text-sm text-charcoal">{customer.name}</p>
                  <p className="font-body text-xs text-charcoal/50">{customer.email}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="font-body text-sm text-charcoal/70">
                    {customer.phone || "—"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="font-body text-sm text-charcoal/70">
                    {customer.orderCount}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="font-body text-sm text-charcoal/70">
                    ₱{customer.totalSpent.toFixed(2)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="font-body text-xs text-charcoal/50">
                    {new Date(customer.joinedAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 font-body text-xs px-3 py-1 rounded-full ${
                      customer.isVerified
                        ? "bg-green-100 text-green-700"
                        : "bg-charcoal/10 text-charcoal/50"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        customer.isVerified ? "bg-green-500" : "bg-charcoal/40"
                      }`}
                    />
                    {customer.isVerified ? "Verified" : "Unverified"}
                  </span>
                </td>
              </tr>
            ))}

            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center">
                  <span className="font-body text-sm text-charcoal/40">
                    No customers match your search.
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