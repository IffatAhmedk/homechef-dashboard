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
        <h1 className="text-xl font-semibold text-neutral-900">Customers</h1>
        <p className="text-sm text-neutral-500">Everyone who has ordered from Rozana.</p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or phone…"
        className="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
      />

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs uppercase text-neutral-400">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 font-medium">Total spent</th>
              <th className="px-4 py-3 font-medium">Last order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-900">{c.name}</td>
                <td className="px-4 py-3 text-neutral-600">{c.phone}</td>
                <td className="max-w-xs truncate px-4 py-3 text-neutral-500">{c.address}</td>
                <td className="px-4 py-3 text-neutral-600">{c.orderCount}</td>
                <td className="px-4 py-3 font-medium text-neutral-900">{formatCurrency(c.totalSpent)}</td>
                <td className="px-4 py-3 text-neutral-500">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-neutral-400">No customers found.</p>}
      </div>
    </div>
  );
}
