import { describe, expect, it } from "vitest";
import { profileEmailSchema, profileErrorMessage, profileNameSchema, profilePasswordSchema } from "./profile";

describe("profile validation", () => {
  it("normalizes the display name and accepts accented names", () => {
    expect(profileNameSchema.parse({ fullName: "  João Silva  " })).toEqual({ fullName: "João Silva" });
  });

  it.each(["", " ", "A", "a".repeat(81)])("rejects an invalid display name: %j", (fullName) => {
    expect(profileNameSchema.safeParse({ fullName }).success).toBe(false);
  });

  it("validates and trims email without accepting other account attributes", () => {
    expect(profileEmailSchema.parse({ email: "  novo@example.test  ", role: "admin" })).toEqual({ email: "novo@example.test" });
    expect(profileEmailSchema.safeParse({ email: "invalid-address" }).success).toBe(false);
  });

  it("requires the current password, a different new password and matching confirmation", () => {
    const valid = { currentPassword: "Current test password", password: "New test password", confirmation: "New test password" };
    expect(profilePasswordSchema.safeParse(valid).success).toBe(true);
    for (const input of [
      { ...valid, currentPassword: "" },
      { ...valid, password: "short", confirmation: "short" },
      { ...valid, password: valid.currentPassword, confirmation: valid.currentPassword },
      { ...valid, confirmation: "Different test password" },
    ]) expect(profilePasswordSchema.safeParse(input).success).toBe(false);
  });

  it("preserves intentional whitespace in passwords", () => {
    const value = { currentPassword: " old test password ", password: " new test password ", confirmation: " new test password " };
    expect(profilePasswordSchema.parse(value)).toEqual(value);
  });
});

describe("profile error privacy", () => {
  it("uses safe messages for known authentication errors", () => {
    expect(profileErrorMessage({ code: "invalid_credentials" })).toContain("senha atual");
    expect(profileErrorMessage({ code: "over_email_send_rate_limit" })).toContain("Aguarde");
  });

  it.each([undefined, new Error("PRIVATE_PASSWORD"), { code: "unexpected_failure", message: "PRIVATE_EMAIL@example.test" }, { code: "__proto__" }, { code: "toString" }])("does not echo provider error details", (error) => {
    const message = profileErrorMessage(error);
    expect(message).toBe("Não foi possível salvar a alteração. Tente novamente em alguns instantes.");
    expect(message).not.toContain("PRIVATE_");
  });
});
