export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  foodpandaPayout: number;
  actualBankDeposit: number | null;
  paymentDate: string | null;
  pendingAmount: number | null;
  disputedAmount: number | null;
  _count: { orders: number };
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}
