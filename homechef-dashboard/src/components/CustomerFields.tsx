"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { findCustomers } from "@/data/orders";
import type { CustomerMatch } from "@/models";

interface CustomerFieldsProps {
  name: string;
  phone: string;
  onName: (name: string) => void;
  onPhone: (phone: string) => void;
  /** Called with the customer picked from the suggestions (or null once the name or phone is typed over). */
  onPick: (customer: CustomerMatch | null) => void;
}

/** Customer name and phone. Typing in either suggests customers you already have. */
export function CustomerFields({ name, phone, onName, onPhone, onPick }: CustomerFieldsProps) {
  const [term, setTerm] = useState("");
  const [matches, setMatches] = useState<CustomerMatch[]>([]);
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    if (picked || term.trim().length < 2) return;
    const timer = setTimeout(async () => setMatches(await findCustomers(term)), 250);
    return () => clearTimeout(timer);
  }, [term, picked]);

  function type(field: "name" | "phone", value: string) {
    if (field === "name") onName(value);
    else onPhone(value);
    setPicked(false);
    setTerm(value);
    onPick(null);
  }

  function pick(customer: CustomerMatch) {
    setPicked(true);
    setMatches([]);
    onPick(customer);
  }

  const showMatches = !picked && term.trim().length >= 2 && matches.length > 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="relative col-span-2">
        <Field label="Customer name">
          <Input required placeholder="Type to find an existing customer" value={name} onChange={(e) => type("name", e.target.value)} />
        </Field>
        {showMatches && (
          <ul className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-lg border border-control bg-card shadow-lg">
            {matches.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => pick(c)} className="block w-full px-3 py-2 text-left text-base hover:bg-sunken">
                  <span className="font-bold text-ink">{c.name}</span>
                  <span className="ml-2 text-ink-muted">{c.phone || "no phone"}</span>
                  {c.address && <span className="block truncate text-caption text-ink-muted">{c.address}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Field label="Phone">
        <Input placeholder="Type to find an existing customer" value={phone} onChange={(e) => type("phone", e.target.value)} />
      </Field>
    </div>
  );
}
