"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCustomers } from "@/data/orders";
import { formatCurrency, formatDate } from "@/lib/format";

export default function CustomersPage() {
  const { data: customers = [] } = useCustomers();
  const [query, setQuery] = useState("");

  const shown = customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query));

  return (
    <div className="space-y-4">
      <PageHeader title="Customers" subtitle="Everyone who has ordered from Rozana." />
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or phone…" className="max-w-sm" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Total spent</TableHead>
            <TableHead>Last order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-bold text-ink">{customer.name}</TableCell>
              <TableCell className="text-ink-muted">{customer.phone}</TableCell>
              <TableCell className="max-w-xs truncate text-ink-muted">{customer.address}</TableCell>
              <TableCell className="text-ink-muted">{customer.orderCount}</TableCell>
              <TableCell className="font-bold">{formatCurrency(customer.totalSpent)}</TableCell>
              <TableCell className="text-ink-muted">{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {shown.length === 0 && <p className="p-6 text-center text-base text-ink-muted">No customers found.</p>}
    </div>
  );
}
