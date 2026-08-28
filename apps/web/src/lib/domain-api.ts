import type { AppBootstrap, Location, Receivable, Shift, Space } from "@financplantoes/shared";
import { api, download } from "./api";

export const domainApi = {
  bootstrap: () => api<AppBootstrap>("/dashboard/bootstrap"),
  createLocation: (payload: unknown) => api<Location>("/locations", { method: "POST", body: payload }),
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
  deleteReceivable: (id: string) => api(`/receivables/${id}`, { method: "DELETE" }),
  createPersonalExpense: (payload: unknown) =>
    api("/expenses/personal", { method: "POST", body: payload }),
  createSharedExpense: (payload: unknown) =>
    api("/expenses/shared", { method: "POST", body: payload }),
  createSpace: (payload: unknown) => api<Space>("/spaces", { method: "POST", body: payload }),
  updateSpace: (id: string, payload: unknown) =>
    api<Space>(`/spaces/${id}`, { method: "PATCH", body: payload }),
  deleteSpace: (id: string) => api(`/spaces/${id}`, { method: "DELETE" }),
  updateSettings: (payload: unknown) => api("/settings", { method: "PUT", body: payload }),
  exportCsv: () => download("/reports/export.csv"),
};
