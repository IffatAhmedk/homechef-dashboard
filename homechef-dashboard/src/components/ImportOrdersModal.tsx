"use client";

import { useState } from "react";
import { ImportFoodpandaInvoices } from "@/components/ImportFoodpandaInvoices";
import { ImportFoodpandaSummary } from "@/components/ImportFoodpandaSummary";
import { ImportOrdersCsv } from "@/components/ImportOrdersCsv";
import { Modal } from "@/components/Modal";
import { PillGroup } from "@/components/PillGroup";

type Kind = "invoices" | "summary" | "csv";

/** Bring orders in from Foodpanda's files or from a spreadsheet of your own. */
export function ImportOrdersModal({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("invoices");

  return (
    <Modal title="Import orders" onClose={onClose}>
      <PillGroup
        label="What to import"
        options={[
          { value: "invoices", label: "Foodpanda orders / invoices" },
          { value: "summary", label: "Foodpanda daily summary" },
          { value: "csv", label: "Orders CSV" },
        ]}
        value={kind}
        onChange={setKind}
      />
      {kind === "invoices" && <ImportFoodpandaInvoices onClose={onClose} />}
      {kind === "summary" && <ImportFoodpandaSummary onClose={onClose} />}
      {kind === "csv" && <ImportOrdersCsv onClose={onClose} />}
    </Modal>
  );
}
