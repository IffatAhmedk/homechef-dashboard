"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ImportFoodpandaInvoices } from "@/components/ImportFoodpandaInvoices";
import { PageHeader } from "@/components/PageHeader";

/** Uploading Foodpanda's order-details and invoice files lives here on its own, away from everything else. */
export default function FoodpandaUploadPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader title="Upload Foodpanda orders" />
      <Card>
        <ImportFoodpandaInvoices onClose={() => router.push("/admin-dashboard/log")} />
      </Card>
    </div>
  );
}
