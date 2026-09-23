"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetcher } from "@/lib/fetcher";

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

export default function AdminCustomersPage() {
  const { data: customers = [] } = useSWR<Customer[]>("/api/customers", fetcher);
  const [query, setQuery] = useState("");

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query)
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl text-ink">Customers</h1>
        <p className="text-sm text-ink-muted">Everyone who has ordered from Rozana.</p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or phone…"
        className="w-full max-w-sm rounded-sm border border-control px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />

      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="px-4 py-3 font-bold">Name</th>
              <th className="px-4 py-3 font-bold">Phone</th>
              <th className="px-4 py-3 font-bold">Address</th>
              <th className="px-4 py-3 font-bold">Orders</th>
              <th className="px-4 py-3 font-bold">Total spent</th>
              <th className="px-4 py-3 font-bold">Last order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-sunken">
                <td className="px-4 py-3 font-bold text-ink">{c.name}</td>
                <td className="px-4 py-3 text-ink-muted">{c.phone}</td>
                <td className="max-w-xs truncate px-4 py-3 text-ink-muted">{c.address}</td>
                <td className="px-4 py-3 text-ink-muted">{c.orderCount}</td>
                <td className="px-4 py-3 font-bold text-ink">{formatCurrency(c.totalSpent)}</td>
                <td className="px-4 py-3 text-ink-muted">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-ink-muted">No customers found.</p>}
      </div>
    </div>
  );
}
