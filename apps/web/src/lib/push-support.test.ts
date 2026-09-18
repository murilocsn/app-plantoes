import { describe, expect, it } from "vitest";
import {
  hasPushSupport,
  isIosDevice,
  isSafariBrowser,
  isStandalonePwa,
  normalizeVapidPublicKey,
  unsupportedPushMessage,
  vapidPublicKeyError,
} from "./push-support";

const IPHONE_SAFARI = {
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  vendor: "Apple Computer, Inc.",
  maxTouchPoints: 5,
};

const MAC_SAFARI = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  vendor: "Apple Computer, Inc.",
  maxTouchPoints: 0,
};

const IPAD_DESKTOP_MODE = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  vendor: "Apple Computer, Inc.",
  maxTouchPoints: 5,
};

const CHROME_WINDOWS = {
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  vendor: "Google Inc.",
  maxTouchPoints: 0,
};

describe("push-support", () => {
  it("detecta iPhone pelo user agent", () => {
    expect(isIosDevice({ ...IPHONE_SAFARI, displayModeStandalone: false })).toBe(true);
  });

  it("detecta iPad em modo desktop pelo toque", () => {
    expect(isIosDevice(IPAD_DESKTOP_MODE)).toBe(true);
  });

  it("nao marca Mac sem toque como iOS", () => {
    expect(isIosDevice(MAC_SAFARI)).toBe(false);
  });

  it("reconhece PWA instalado pelo display-mode", () => {
    expect(isStandalonePwa({ ...IPHONE_SAFARI, displayModeStandalone: true })).toBe(true);
  });

  it("reconhece PWA instalado pelo navigator.standalone", () => {
    expect(isStandalonePwa({ ...IPHONE_SAFARI, standalone: true })).toBe(true);
  });

  it("orienta instalar o PWA quando iPhone esta no Safari", () => {
    expect(unsupportedPushMessage({ ...IPHONE_SAFARI, displayModeStandalone: false })).toContain(
      "Adicionar a Tela de Inicio",
    );
  });

  it("nao pede instalacao quando iPhone ja esta no PWA", () => {
    expect(unsupportedPushMessage({ ...IPHONE_SAFARI, displayModeStandalone: true })).toContain("No Safari");
  });

  it("orienta liberar notificacao no Safari desktop", () => {
    expect(unsupportedPushMessage({ ...MAC_SAFARI, displayModeStandalone: false })).toContain("libere Notificacoes");
  });

  it("detecta Safari legitimo e ignora Chrome", () => {
    expect(isSafariBrowser(MAC_SAFARI)).toBe(true);
    expect(isSafariBrowser(CHROME_WINDOWS)).toBe(false);
  });

  it("mostra mensagem generica em navegador sem push", () => {
    expect(unsupportedPushMessage({ ...CHROME_WINDOWS, displayModeStandalone: false })).toBe(
      "Este navegador nao suporta notificacoes Push.",
    );
  });

  it("normaliza e valida a chave VAPID", () => {
    expect(normalizeVapidPublicKey("  chave  ")).toBe("chave");
    expect(vapidPublicKeyError(undefined)).toContain("VITE_VAPID_PUBLIC_KEY");
    expect(vapidPublicKeyError("   ")).toContain("VITE_VAPID_PUBLIC_KEY");
    expect(vapidPublicKeyError("chave-valida")).toBeNull();
  });

  it("avalia suporte a push a partir das APIs do navegador", () => {
    expect(hasPushSupport({ serviceWorker: true, pushManager: true, notification: true })).toBe(true);
    expect(hasPushSupport({ serviceWorker: true, pushManager: false, notification: true })).toBe(false);
  });
});
