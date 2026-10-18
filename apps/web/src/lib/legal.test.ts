import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LegalAcknowledgmentError, PRIVACY_SHA256, PRIVACY_VERSION, signupLegalMetadata, TERMS_SHA256, TERMS_VERSION } from "./legal";

const accepted = {
  termsAccepted: true, privacyAcknowledged: true,
  termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION,
};

describe("ciência no cadastro", () => {
  it.each([undefined, null, false, "true", {},
    { ...accepted, termsAccepted: false }, { ...accepted, privacyAcknowledged: false },
    { ...accepted, termsAccepted: "true" }, { ...accepted, privacyAcknowledged: 1 },
    { ...accepted, termsVersion: "antiga" }, { ...accepted, privacyVersion: "antiga" },
  ])("rejeita ausência de manifestação ou versão incompatível (%j)", (input) => {
    expect(() => signupLegalMetadata(input)).toThrow(LegalAcknowledgmentError);
  });

  it("encaminha somente manifestação e identificadores dos documentos", () => {
    const result = signupLegalMetadata({ ...accepted, ip: "private-ip", email: "private-email", token: "private-token", timestamp: "client-clock", fullName: "private-name" });
    expect(result).toEqual({ legal_acknowledgment: {
      terms_accepted: true, terms_version: TERMS_VERSION, terms_sha256: TERMS_SHA256,
      privacy_acknowledged: true, privacy_version: PRIVACY_VERSION, privacy_sha256: PRIVACY_SHA256,
    } });
    expect(JSON.stringify(result)).not.toContain("private-");
    expect(JSON.stringify(result)).not.toContain("client-clock");
  });

  it.each([
    ["termos-de-uso", TERMS_VERSION, TERMS_SHA256],
    ["aviso-de-privacidade", PRIVACY_VERSION, PRIVACY_SHA256],
  ])("identifica exatamente o documento apresentado (%s)", (name, version, hash) => {
    const content = readFileSync(new URL(`../../../../docs/07-privacidade-lgpd/${name}.md`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
    expect(content).toContain(`versão ${version}`);
    expect(createHash("sha256").update(content).digest("hex")).toBe(hash);
  });
});
