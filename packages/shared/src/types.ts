import type { z } from "zod";
import type {
  expenseSchema,
  locationSchema,
  receivableSchema,
  shiftSchema,
  spaceSchema,
} from "./schemas";

export type ApiEnvelope<T> = {
  data: T;
};

export type ApiErrorEnvelope = {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

export type Location = z.infer<typeof locationSchema>;
export type Shift = z.infer<typeof shiftSchema>;
export type Receivable = z.infer<typeof receivableSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type Space = z.infer<typeof spaceSchema>;

export type DashboardSummary = {
  monthKey: string;
  incomeProjected: number;
  received: number;
  pending: number;
  expenses: number;
  net: number;
  shiftCount: number;
  shiftHours: number;
  activeLocationCount: number;
  nextReceivable: Receivable | null;
};

export type AppBootstrap = {
  summary: DashboardSummary;
  shifts: Shift[];
  locations: Location[];
  receivables: Receivable[];
  personalExpenses: Expense[];
  sharedExpenses: Expense[];
  spaces: Space[];
  plans: Plan[];
};

import type { planSchema } from "./schemas";

export type Plan = z.infer<typeof planSchema>;