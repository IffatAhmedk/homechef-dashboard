import type { Prisma } from "@prisma/client";

interface CustomerInput {
  customerId?: string;
  name: string;
  phone?: string;
  address?: string;
}

export async function resolveCustomer(tx: Prisma.TransactionClient, input: CustomerInput) {
  const address = input.address?.trim() || "";
  const addressPatch = address ? { address } : {};

  if (input.customerId) {
    return tx.customer.update({ where: { id: input.customerId }, data: { name: input.name, ...addressPatch } });
  }
  const phone = input.phone?.trim() || `manual-${Date.now()}`;
  return tx.customer.upsert({
    where: { phone },
    update: { name: input.name, ...addressPatch },
    create: { name: input.name, phone, address: address || null },
  });
}
