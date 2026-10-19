import { once } from "node:events";
import { request, type Server } from "node:http";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { expenseSharingSnapshot } from "../lib/expense-sharing";

vi.mock("../config/env", () => ({
  env: { NODE_ENV: "production", WEB_ORIGIN: "http://localhost:5173" },
}));
const { getUser, createSupabaseForToken, rpc, from } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createSupabaseForToken: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({ authSupabase: { auth: { getUser } }, createSupabaseForToken }));
let server: Server | undefined;
const id = "20000000-0000-4000-8000-000000000001";
async function post(path: string, body: unknown, authenticated = true, method = "POST") {
  if (!server) {
    server = createApp().listen(0, "127.0.0.1");
    await once(server, "listening");
  }
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing local port");
  return new Promise<{ status: number; body: { data?: unknown; error?: { code: string } } }>(
    (resolve, reject) => {
      const outgoing = request(
        {
          hostname: "127.0.0.1",
          port: address.port,
          path: `/api/expenses${path}`,
          method,
          agent: false,
          headers: {
            "content-type": "application/json",
            ...(authenticated ? { authorization: "Bearer synthetic-token" } : {}),
          },
        },
        (response) => {
          let text = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            text += chunk;
          });
          response.on("end", () =>
            resolve({ status: response.statusCode!, body: JSON.parse(text) }),
          );
        },
      );
      outgoing.once("error", reject);
      outgoing.setTimeout(3000, () => outgoing.destroy(new Error("Local test timeout")));
      outgoing.end(method === "GET" ? undefined : JSON.stringify(body));
    },
  );
}
beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: id, error: null });
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  from.mockReset();
  createSupabaseForToken.mockReset().mockReturnValue({ rpc, from });
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected external request"));
});
afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  }
  vi.restoreAllMocks();
});
describe("expense sharing API", () => {
  it("loads only expense data and scopes personal and legacy queries to the caller", async () => {
    const filters: unknown[] = [];
    from.mockImplementation((table) => ({
      select: () => ({
        eq: (column: string, userId: string) => {
          filters.push([table, column, userId]);
          return {
            order: () =>
              Promise.resolve({
                data: table === "personal_expenses" ? [{ id: "personal", amount: 50 }] : [],
                error: null,
              }),
          };
        },
      }),
    }));
    rpc.mockResolvedValue({
      data: {
        cards: [],
        invitations: [],
        locations: [],
        personal_locations: [{ expense_id: "personal", location_card_id: id }],
      },
      error: null,
    });
    const result = await post("/overview", {}, true, "GET");
    expect(result.status).toBe(200);
    expect(filters).toEqual([
      ["personal_expenses", "user_id", "owner"],
      ["expenses", "paid_by", "owner"],
    ]);
    expect(from).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(result.body.data).toMatchObject({
      personal: [{ id: "personal", location_card_id: id }],
      shared: [],
    });
  });
  it.each([
    "/cards",
    "/locations",
    `/locations/${id}/expenses`,
    `/locations/${id}/invitations`,
    `/cards/${id}/invitations`,
    `/invitations/${id}/respond`,
    `/invitations/${id}/cancel`,
  ])("requires authentication for %s", async (path) => {
    expect((await post(path, {}, false)).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("creates through the caller's session and ignores spoofed ownership", async () => {
    const result = await post("/cards", {
      description: "Clinic",
      amount: 300.01,
      expense_date: "2026-10-15",
      owner_id: "someone-else",
    });
    expect(result.status).toBe(201);
    expect(createSupabaseForToken).toHaveBeenCalledWith("synthetic-token");
    expect(rpc).toHaveBeenCalledWith("expense_sharing_create", {
      p_description: "Clinic",
      p_amount: 300.01,
      p_expense_date: "2026-10-15",
      p_category: null,
      p_notes: null,
    });
  });
  it("creates a location without accepting client ownership", async () => {
    expect(
      (await post("/locations", { name: " Residência ", visibility: "shared", owner_id: "other" }))
        .status,
    ).toBe(201);
    expect(rpc).toHaveBeenCalledWith("expense_location_create", {
      p_name: "Residência",
      p_visibility: "shared",
    });
  });
  it("links personal expenses through the permission-checked operation", async () => {
    expect(
      (
        await post("/personal", {
          description: "Internet",
          amount: 50,
          expense_date: "2026-10-18",
          location_card_id: id,
          user_id: "other",
        })
      ).status,
    ).toBe(201);
    expect(rpc).toHaveBeenCalledWith("expense_location_add_personal", {
      p_card_id: id,
      p_description: "Internet",
      p_amount: 50,
      p_expense_date: "2026-10-18",
      p_category: null,
      p_notes: null,
    });
  });
  it("creates personal expenses without a location using server-owned identity", async () => {
    const insert = vi
      .fn()
      .mockReturnValue({
        select: () => ({ single: () => Promise.resolve({ data: { id }, error: null }) }),
      });
    from.mockReturnValue({ insert });
    expect(
      (
        await post("/personal", {
          description: "Transporte",
          amount: 20.5,
          expense_date: "2026-10-18",
          location_card_id: "",
          user_id: "other",
        })
      ).status,
    ).toBe(201);
    expect(from).toHaveBeenCalledWith("personal_expenses");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "owner", description: "Transporte", amount: 20.5 }),
    );
  });
  it("renames through the owner-checked operation without changing visibility", async () => {
    expect(
      (
        await post(
          `/locations/${id}`,
          { name: " Casa ", visibility: "public", owner_id: "other" },
          true,
          "PATCH",
        )
      ).status,
    ).toBe(200);
    expect(rpc).toHaveBeenCalledWith("expense_location_rename", { p_card_id: id, p_name: "Casa" });
  });
  it("uses the selected location from the URL for shared expenses", async () => {
    expect(
      (
        await post(`/locations/${id}/expenses`, {
          description: "Aluguel",
          amount: 300.01,
          expense_date: "2026-10-18",
          location_card_id: "spoofed",
          expense_split: { attacker: 0 },
        })
      ).status,
    ).toBe(201);
    expect(rpc).toHaveBeenCalledWith("expense_location_add_shared", {
      p_card_id: id,
      p_description: "Aluguel",
      p_amount: 300.01,
      p_expense_date: "2026-10-18",
      p_category: null,
      p_notes: null,
    });
  });
  it("sends membership invitations without accepting a monetary allocation", async () => {
    expect(
      (
        await post(`/locations/${id}/invitations`, {
          email: " GUEST@EXAMPLE.TEST ",
          amount: 500,
          invited_user_id: "other",
        })
      ).status,
    ).toBe(201);
    expect(rpc).toHaveBeenCalledWith("expense_location_invite", {
      p_card_id: id,
      p_email: "guest@example.test",
    });
  });
  it.each([
    ["/locations", { name: "A", visibility: "shared" }],
    ["/locations", { name: "Clinic", visibility: "public" }],
    [
      `/locations/${id}/expenses`,
      { description: "Aluguel", amount: 1.001, expense_date: "2026-10-18" },
    ],
    [
      "/personal",
      {
        description: "Internet",
        amount: 50,
        expense_date: "2026-10-18",
        location_card_id: "invalid",
      },
    ],
  ])("rejects invalid location input %#", async (path, body) => {
    expect((await post(path as string, body)).status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("normalizes the email without accepting a client-supplied recipient id", async () => {
    expect(
      (
        await post(`/cards/${id}/invitations`, {
          email: " GUEST@EXAMPLE.TEST ",
          amount: 50.01,
          invited_user_id: "someone-else",
        })
      ).status,
    ).toBe(201);
    expect(rpc).toHaveBeenCalledWith("expense_sharing_invite", {
      p_card_id: id,
      p_email: "guest@example.test",
      p_amount: 50.01,
    });
  });
  it.each([
    { email: "invalid", amount: 10 },
    { email: "guest@example.test", amount: -1 },
    { email: "guest@example.test", amount: 0.001 },
  ])("rejects invalid invitations %#", async (body) => {
    expect((await post(`/cards/${id}/invitations`, body)).status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects invalid identifiers and states before calling the database", async () => {
    expect(
      (await post("/cards/invalid/invitations", { email: "guest@example.test", amount: 10 }))
        .status,
    ).toBe(422);
    expect((await post(`/invitations/${id}/respond`, { action: "owner" })).status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["accepted", "declined"])("responds with %s using authenticated RPC", async (action) => {
    expect((await post(`/invitations/${id}/respond`, { action })).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("expense_sharing_respond", {
      p_invitation_id: id,
      p_action: action,
    });
  });
  it("cancels through the owner-checked operation", async () => {
    expect((await post(`/invitations/${id}/cancel`, {})).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("expense_sharing_cancel", { p_invitation_id: id });
  });
  it.each([
    ["42501", 403],
    ["23505", 409],
    ["P0001", 409],
    ["P0002", 404],
    ["22023", 400],
    ["54000", 429],
    ["PGRST202", 503],
    ["XX000", 503],
  ])("handles database error %s without exposing private details", async (code, status) => {
    rpc.mockResolvedValue({
      data: null,
      error: { code, message: "PRIVATE_TOKEN private@example.test", details: "secret" },
    });
    const result = await post(`/cards/${id}/invitations`, {
      email: "guest@example.test",
      amount: 1,
    });
    expect(result.status).toBe(status);
    expect(result.body.data).toBeUndefined();
    expect(JSON.stringify(result.body)).not.toMatch(/PRIVATE_TOKEN|private@example|secret/);
  });
});
describe("expense sharing snapshot", () => {
  const client = { rpc } as unknown as SupabaseClient;
  it("distinguishes an absent migration from a legitimately empty list", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
    await expect(expenseSharingSnapshot(client)).resolves.toEqual({
      available: false,
      cards: [],
      invitations: [],
    });
    rpc.mockResolvedValueOnce({ data: { cards: [], invitations: [] }, error: null });
    await expect(expenseSharingSnapshot(client)).resolves.toEqual({
      available: true,
      cards: [],
      invitations: [],
    });
  });
  it("does not hide permission failures or malformed responses", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expect(expenseSharingSnapshot(client)).rejects.toMatchObject({ status: 503 });
    rpc.mockResolvedValueOnce({ data: { cards: [], invitations: [], locations: {} }, error: null });
    await expect(expenseSharingSnapshot(client)).rejects.toMatchObject({ status: 503 });
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(expenseSharingSnapshot(client)).rejects.toMatchObject({ status: 503 });
  });
});
