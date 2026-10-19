import type {
  AppBootstrap,
  AiChatResponse,
  DashboardOverview,
  Location,
  Receivable,
  Shift,
  Space,
  Expense,
  ExpenseSharingSnapshot,
} from "@financplantoes/shared";
import { api, download } from "./api";

export const domainApi = {
  expenses: () =>
    api<{
      personal: Expense[];
      shared: Expense[];
      expenseSharing: ExpenseSharingSnapshot;
    }>("/expenses/overview"),
  createExpenseLocation: (payload: unknown) =>
    api("/expenses/locations", { method: "POST", body: payload }),
  renameExpenseLocation: ({ id, name }: { id: string; name: string }) =>
    api(`/expenses/locations/${id}`, { method: "PATCH", body: { name } }),
  inviteExpenseLocation: ({ id, email }: { id: string; email: string }) =>
    api(`/expenses/locations/${id}/invitations`, { method: "POST", body: { email } }),
  addLocatedSharedExpense: ({
    location_card_id,
    ...body
  }: {
    location_card_id: string;
    description: string;
    amount: number;
    expense_date: string;
    category?: string | null;
    notes?: string | null;
  }) => api(`/expenses/locations/${location_card_id}/expenses`, { method: "POST", body }),
  bootstrap: () => api<AppBootstrap>("/dashboard/bootstrap"),
  receivables: () => api<Receivable[]>("/receivables"),
  dashboardOverview: (filters?: { month?: string }) => {
    const params = new URLSearchParams();
    if (filters?.month) params.set("month", filters.month);
    const query = params.toString();
    return api<DashboardOverview>(`/dashboard/overview${query ? `?${query}` : ""}`);
  },
  createLocation: (payload: unknown) =>
    api<Location>("/locations", { method: "POST", body: payload }),
  updateLocation: (id: string, payload: unknown) =>
    api<Location>(`/locations/${id}`, { method: "PATCH", body: payload }),
  deleteLocation: (id: string) => api(`/locations/${id}`, { method: "DELETE" }),
  createShift: (payload: unknown) => api<Shift[]>("/shifts", { method: "POST", body: payload }),
  updateShift: (id: string, payload: unknown) =>
    api<Shift>(`/shifts/${id}`, { method: "PATCH", body: payload }),
  deleteShift: (id: string, scope: "only" | "future" | "all") =>
    api(`/shifts/${id}`, { method: "DELETE", body: { scope } }),
  createReceivable: (payload: unknown) =>
    api<Receivable>("/receivables", { method: "POST", body: payload }),
  updateReceivable: (id: string, payload: unknown) =>
    api<Receivable>(`/receivables/${id}`, { method: "PATCH", body: payload }),
  markReceivablePaid: (id: string, payload: unknown) =>
    api<Receivable>(`/receivables/${id}/mark-paid`, { method: "POST", body: payload }),
  markReceivablesPaid: (payload: unknown) =>
    api<Receivable[]>("/receivables/mark-paid", { method: "POST", body: payload }),
  deleteReceivable: (id: string) => api(`/receivables/${id}`, { method: "DELETE" }),
  createPersonalExpense: (payload: unknown) =>
    api("/expenses/personal", { method: "POST", body: payload }),
  createSharedExpense: (payload: unknown) =>
    api("/expenses/shared", { method: "POST", body: payload }),
  createExpenseCard: (payload: unknown) =>
    api("/expenses/cards", { method: "POST", body: payload }),
  inviteExpenseParticipant: ({ id, ...body }: { id: string; email: string; amount: number }) =>
    api(`/expenses/cards/${id}/invitations`, { method: "POST", body }),
  respondExpenseInvitation: ({ id, action }: { id: string; action: "accepted" | "declined" }) =>
    api(`/expenses/invitations/${id}/respond`, { method: "POST", body: { action } }),
  cancelExpenseInvitation: (id: string) =>
    api(`/expenses/invitations/${id}/cancel`, { method: "POST" }),
  createSpace: (payload: unknown) => api<Space>("/spaces", { method: "POST", body: payload }),
  updateSpace: (id: string, payload: unknown) =>
    api<Space>(`/spaces/${id}`, { method: "PATCH", body: payload }),
  deleteSpace: (id: string) => api(`/spaces/${id}`, { method: "DELETE" }),
  updateSettings: (payload: unknown) => api("/settings", { method: "PUT", body: payload }),
  aiChat: (payload: unknown) => api<AiChatResponse>("/ai/chat", { method: "POST", body: payload }),
  exportCsv: (filters?: { from?: string; to?: string; location_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    if (filters?.location_id) params.set("location_id", filters.location_id);
    const query = params.toString();
    return download(`/reports/export.csv${query ? `?${query}` : ""}`);
  },
};
