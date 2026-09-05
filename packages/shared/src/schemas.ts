import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable()
  .optional();

// Métodos de pagamento aceitos pela constraint do banco
// (receivables_payment_method_check). Valores mantidos em minúsculas
// por compatibilidade com o comportamento legado do sistema.
export const PAYMENT_METHOD_VALUES = ["pix", "transfer", "cash", "card", "other"] as const;

export const PAYMENT_METHODS: ReadonlyArray<{
  value: (typeof PAYMENT_METHOD_VALUES)[number];
  label: string;
}> = [
  { value: "pix", label: "PIX" },
  { value: "transfer", label: "Transferência" },
  { value: "cash", label: "Dinheiro" },
  { value: "card", label: "Cartão" },
  { value: "other", label: "Outro" },
];

// Aceita um dos métodos conhecidos ou vazio (convertido para null).
const paymentMethod = z
  .enum(PAYMENT_METHOD_VALUES)
  .or(z.literal("").transform(() => null))
  .nullable()
  .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .pipe(z.string().date().nullable())
  .optional();

export const idParamSchema = z.object({
  id: z.string().min(1, "Id obrigatorio"),
});

export const dateRangeQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  value12: z.coerce.number(),
  doc: z.string().nullable().optional(),
  active: z.boolean().nullable().optional(),
  reference_start_day: z.coerce.number().int().min(1).max(31).default(1),
  reference_end_day: z.coerce.number().int().min(1).max(31).default(28),
  payment_due_day: z.coerce.number().int().min(1).max(31).default(10),
  payment_due_months_after: z.coerce.number().int().min(0).max(12).default(1),
  created_at: z.string().optional(),
});

export const locationInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do local"),
  value12: z.coerce.number().min(0, "O valor nao pode ser negativo"),
  doc: optionalText,
  active: z.boolean().optional(),
  reference_start_day: z.coerce.number().int().min(1).max(31).default(1),
  reference_end_day: z.coerce.number().int().min(1).max(31).default(28),
  payment_due_day: z.coerce.number().int().min(1).max(31).default(10),
  payment_due_months_after: z.coerce.number().int().min(0).max(12).default(1),
});

export const shiftStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);

export const shiftSchema = z.object({
  id: z.string(),
  date: z.string(),
  start_time: z.string().nullable().optional(),
  location_id: z.string().nullable().optional(),
  location_name: z.string(),
  duration: z.coerce.number(),
  value: z.coerce.number().nullable().optional(),
  value12: z.coerce.number().nullable().optional(),
  professional: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  recurrence_id: z.string().nullable().optional(),
  recurring_group_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export const shiftInputSchema = z.object({
  date: z.string().date("Informe uma data valida"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Informe um horario valido"),
  location_id: z.string().min(1, "Selecione um local"),
  duration: z.coerce.number().min(1).max(48),
  value: z.coerce.number().min(0),
  professional: optionalText,
  notes: optionalText,
  status: shiftStatusSchema.default("scheduled"),
  createReceivable: z.boolean().default(true),
});

export const recurrenceInputSchema = z.object({
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]),
  interval_value: z.coerce.number().min(1).max(365).default(1),
  end_date: z.string().date().nullable().optional(),
  occurrences: z.coerce.number().min(2).max(500).nullable().optional(),
});

export const receivableStatusSchema = z.enum(["pending", "received", "overdue", "cancelled"]);

export const receivableSchema = z.object({
  id: z.string(),
  shift_id: z.string().nullable().optional(),
  location_id: z.string().nullable().optional(),
  description: z.string(),
  amount: z.coerce.number(),
  expected_date: z.string().nullable().optional(),
  received_date: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  status: receivableStatusSchema.or(z.string()),
  notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export const receivableInputSchema = z.object({
  description: z.string().trim().min(2, "Informe uma descricao"),
  amount: z.coerce.number().min(0),
  expected_date: z.string().date("Informe a data prevista"),
  location_id: z.string().nullable().optional(),
  shift_id: z.string().nullable().optional(),
  status: receivableStatusSchema.default("pending"),
  payment_method: paymentMethod,
  notes: optionalText,
});

export const markReceivablePaidSchema = z.object({
  received_date: z.string().date().optional(),
  payment_method: paymentMethod,
  notes: optionalText,
});

export const expenseSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.coerce.number(),
  expense_date: z.string(),
  category: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export const personalExpenseInputSchema = z.object({
  description: z.string().trim().min(2, "Informe uma descricao"),
  amount: z.coerce.number().min(0),
  expense_date: z.string().date("Informe uma data valida"),
  category: optionalText,
  notes: optionalText,
});

export const spaceTypeSchema = z.enum([
  "residence",
  "clinic",
  "trip",
  "event",
  "team",
  "project",
  "other",
]);

export const spaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  space_type: z.string(),
  description: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  archived: z.boolean().nullable().optional(),
  owner_id: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
});

export const spaceInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do espaco"),
  space_type: spaceTypeSchema.default("other"),
  description: optionalText,
  start_date: optionalDate,
  end_date: optionalDate,
});

export const sharedExpenseInputSchema = z.object({
  space_id: z.string().min(1, "Selecione um espaco"),
  description: z.string().trim().min(2, "Informe uma descricao"),
  amount: z.coerce.number().min(0),
  expense_date: z.string().date("Informe uma data valida"),
  category: optionalText,
  split_method: z.enum(["equal", "selected"]).default("equal"),
  notes: optionalText,
});

export const settingsInputSchema = z.object({
  monthly_goal: z.coerce.number().min(0),
});

export const billingIntervalSchema = z.enum(["monthly", "annual"]);

export const planSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  price_cents: z.coerce.number().min(0),
  currency: z.string().min(1).default("BRL"),
  billing_interval: billingIntervalSchema,
  features: z.array(z.string()).optional().default([]),
  active: z.boolean().optional().default(true),
  created_at: z.string().optional(),
});

export const planInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do plano"),
  slug: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  price_cents: z.coerce.number().min(0),
  currency: z.string().optional().default("BRL"),
  billing_interval: billingIntervalSchema,
  features: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});