export type PushBrowserInfo = {
  userAgent?: string;
  vendor?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  displayModeStandalone?: boolean;
};

function readUserAgent(info?: PushBrowserInfo): string {
  if (info?.userAgent !== undefined) {
    return info.userAgent;
  }

  return typeof navigator === "undefined" ? "" : navigator.userAgent || "";
}

function readVendor(info?: PushBrowserInfo): string {
  if (info?.vendor !== undefined) {
    return info.vendor;
  }

  return typeof navigator === "undefined" ? "" : navigator.vendor || "";
}

function readMaxTouchPoints(info?: PushBrowserInfo): number {
  if (typeof info?.maxTouchPoints === "number") {
    return info.maxTouchPoints;
  }

  if (typeof navigator !== "undefined" && typeof navigator.maxTouchPoints === "number") {
    return navigator.maxTouchPoints;
  }

  return 0;
}

export function isIosDevice(info?: PushBrowserInfo): boolean {
  const userAgent = readUserAgent(info);
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return true;
  }

  return /Macintosh/.test(userAgent) && readMaxTouchPoints(info) > 1;
}

export function isStandalonePwa(info?: PushBrowserInfo): boolean {
  if (info?.displayModeStandalone !== undefined) {
    if (info.displayModeStandalone) {
      return true;
    }
  } else if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  if (info?.standalone !== undefined) {
    return info.standalone;
  }

  if (typeof navigator === "undefined") {
    return false;
  }

  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isSafariBrowser(info?: PushBrowserInfo): boolean {
  const userAgent = readUserAgent(info);
  const vendor = readVendor(info);

  return /Safari/.test(userAgent) && /Apple Computer/.test(vendor) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
}

export function unsupportedPushMessage(info?: PushBrowserInfo): string {
  if (isIosDevice(info) && !isStandalonePwa(info)) {
    return "No iPhone/iPad: toque em Compartilhar > Adicionar a Tela de Inicio, abra o app instalado e ative os lembretes.";
  }

  if (isSafariBrowser(info)) {
    return "No Safari: libere Notificacoes do site, use HTTPS e, no iPhone/iPad, ative pelo app instalado na Tela de Inicio.";
  }

  return "Este navegador nao suporta notificacoes Push.";
}

export function normalizeVapidPublicKey(value: string | undefined): string {
  return (value || "").trim();
}

export function hasPushSupport(info: {
  serviceWorker?: boolean;
  pushManager?: boolean;
  notification?: boolean;
}): boolean {
  return Boolean(info.serviceWorker && info.pushManager && info.notification);
}

export function vapidPublicKeyError(publicKey: string | undefined): string | null {
  if (!normalizeVapidPublicKey(publicKey)) {
    return "Configure VITE_VAPID_PUBLIC_KEY para ativar os lembretes.";
  }

  return null;
}
