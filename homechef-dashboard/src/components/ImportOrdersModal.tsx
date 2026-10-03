"use client";

import { useState } from "react";
import { ImportFoodpandaInvoices } from "@/components/ImportFoodpandaInvoices";
import { ImportOrdersCsv } from "@/components/ImportOrdersCsv";
import { Modal } from "@/components/Modal";
import { PillGroup } from "@/components/PillGroup";

type Kind = "invoices" | "csv";

/** Bring orders in from Foodpanda's files or from a spreadsheet of your own. */
export function ImportOrdersModal({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("invoices");

  return (
    <Modal title="Import orders" onClose={onClose}>
      <PillGroup
        label="What to import"
        options={[
          { value: "invoices", label: "Foodpanda orders + invoices" },
          { value: "csv", label: "Orders CSV (optional)" },
        ]}
        value={kind}
        onChange={setKind}
      />
      {kind === "invoices" && <ImportFoodpandaInvoices onClose={onClose} />}
      {kind === "csv" && <ImportOrdersCsv onClose={onClose} />}
    </Modal>
  );
}
