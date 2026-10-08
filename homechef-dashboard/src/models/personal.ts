export type PersonalExpenseCategory = "GAS" | "MILK" | "PETROL" | "WAQAR_BALANCE" | "WAQAR_OWES" | "AMMI_OWES" | "RATION" | "ZUHA";

export interface PersonalExpenseEntry {
  id: string;
  category: PersonalExpenseCategory;
  description: string;
  amount: number;
  date: string;
}

export interface RationItemEntry {
  id: string;
  name: string;
  amount: number;
  date: string;
}
