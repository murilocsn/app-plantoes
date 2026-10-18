export const TERMS_VERSION = "2026-10-17-modelo.2";
export const PRIVACY_VERSION = "2026-10-17-modelo.2";

// SHA-256 of the UTF-8 document with LF line endings. Changes require a new version.
export const TERMS_SHA256 = "1786ec30c78d3fb49017d592672a0f42e4a84e2dad642080a2521afeeb80022c";
export const PRIVACY_SHA256 = "64fb7f298246db3ea667c34572e64ce6528f59f5e65bc317f8588e317fc8c974";

export type SignupAcknowledgment = {
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
  termsVersion: string;
  privacyVersion: string;
};

export class LegalAcknowledgmentError extends Error {
  constructor() {
    super("Para criar sua conta, aceite os Termos de Uso e confirme a ciência do Aviso de Privacidade nas versões atuais.");
    this.name = "LegalAcknowledgmentError";
  }
}

export function signupLegalMetadata(input: unknown) {
  const acknowledgment = input as Partial<SignupAcknowledgment> | null | undefined;
  if (
    !acknowledgment || typeof acknowledgment !== "object" ||
    acknowledgment.termsAccepted !== true || acknowledgment.privacyAcknowledged !== true ||
    acknowledgment.termsVersion !== TERMS_VERSION || acknowledgment.privacyVersion !== PRIVACY_VERSION
  ) throw new LegalAcknowledgmentError();

  // Allowlist only. No browser fingerprint, IP, credentials or client timestamp.
  // This is a signup declaration, not a tamper-resistant server-side acceptance log.
  return {
    legal_acknowledgment: {
      terms_accepted: true,
      terms_version: TERMS_VERSION,
      terms_sha256: TERMS_SHA256,
      privacy_acknowledged: true,
      privacy_version: PRIVACY_VERSION,
      privacy_sha256: PRIVACY_SHA256,
    },
  };
}
