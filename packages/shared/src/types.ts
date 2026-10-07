import type { z } from "zod";
import type {
  expenseSchema,
  aiChatInputSchema,
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
export type AiChatInput = z.infer<typeof aiChatInputSchema>;

export type AiChatSource = {
  id: string;
  title: string;
  organization: string;
  url: string;
  summary: string;
};

export type AiChatResponse = {
  answer: string;
  safetyNotice: string;
  sources: AiChatSource[];
  mode: "ai" | "source-summary";
  model: string | null;
  generatedAt: string;
  emergency: boolean;
};

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

export type DashboardOverview = {
  summary: DashboardSummary;
  calendarShifts: Shift[];
  upcomingShifts: Shift[];
  receivables: Receivable[];
  locations: Location[];
  spaceCount: number;
};

import type { planSchema } from "./schemas";

export type Plan = z.infer<typeof planSchema>;
