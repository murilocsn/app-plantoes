import { Bell, BellOff, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Button } from "./Button";

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function isIosDevice() {
  const userAgent = navigator.userAgent || "";
  const maxTouchPoints = typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return true;
  }
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

function isStandalonePwa() {
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isSafariBrowser() {
  const userAgent = navigator.userAgent || "";
  const vendor = navigator.vendor || "";
  return /Safari/.test(userAgent) && /Apple Computer/.test(vendor) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
}

function unsupportedPushMessage() {
  if (isIosDevice() && !isStandalonePwa()) {
    return "No iPhone/iPad: toque em Compartilhar > Adicionar a Tela de Inicio, abra o app instalado e ative os lembretes.";
  }

  if (isSafariBrowser()) {
    return "No Safari: libere Notificacoes do site, use HTTPS e, no iPhone/iPad, ative pelo app instalado na Tela de Inicio.";
  }

  return "Este navegador nao suporta notificacoes Push.";
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

export function PushReminderButton() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const label = pending
    ? enabled
      ? "Desativando..."
      : "Ativando..."
    : enabled
      ? "Lembretes ativos"
      : "Ativar lembretes";

  useEffect(() => {
    let mounted = true;

    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (mounted) {
          setEnabled(Boolean(subscription));
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [user]);

  async function activate() {
    setMessage("");
    const publicKey = vapidPublicKey?.trim();

    if (!publicKey) {
      setMessage("Configure VITE_VAPID_PUBLIC_KEY para ativar os lembretes.");
      return;
    }

    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setMessage(unsupportedPushMessage());
      return;
    }

    setPending(true);
    setMessage("Solicitando permissao do navegador...");

    try {
      if (Notification.permission === "denied") {
        throw new Error("Notificacoes bloqueadas. Libere as notificacoes do site nas configuracoes do navegador.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permissao de notificacao nao concedida.");
      }

      setMessage("Ativando lembretes no aparelho...");

      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw.js`,
      );
      let applicationServerKey: Uint8Array<ArrayBuffer>;
      try {
        applicationServerKey = base64ToBytes(publicKey);
      } catch {
        throw new Error("Chave VAPID publica invalida. Gere uma nova chave e atualize o ambiente.");
      }

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }));
      const json = subscription.toJSON();
      const keys = json.keys;

      if (!json.endpoint || !keys?.p256dh || !keys.auth) {
        throw new Error("Nao foi possivel obter os dados da inscricao Push.");
      }

      setMessage("Salvando este aparelho...");

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: "endpoint" },
      );

      if (error) {
        throw error;
      }

      setEnabled(true);
      setMessage("Lembretes ativados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel ativar os lembretes.");
    } finally {
      setPending(false);
    }
  }

  async function deactivate() {
    setMessage("");
    setPending(true);

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error(unsupportedPushMessage());
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setEnabled(false);
        setMessage("Nenhuma inscricao ativa neste aparelho.");
        return;
      }

      const endpoint = subscription.endpoint;
      const unsubscribed = await subscription.unsubscribe();

      if (!unsubscribed) {
        throw new Error("Nao foi possivel desativar as notificacoes no navegador.");
      }

      setEnabled(false);
      setMessage("Lembretes desativados.");

      const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

      if (error) {
        setMessage(
          "Lembretes desativados neste aparelho, mas nao foi possivel remover o registro do servidor.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nao foi possivel desativar os lembretes.",
      );
    } finally {
      setPending(false);
    }
  }

  async function sendTestNotification() {
    setMessage("");
    setPending(true);

    try {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        throw new Error("Este navegador nao suporta notificacoes.");
      }

      if (Notification.permission !== "granted") {
        throw new Error("Ative os lembretes antes de enviar um teste.");
      }

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("Teste de lembrete", {
        body: "Se voce recebeu este aviso, o aparelho esta pronto para os alertas de plantao.",
        icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
        badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
        tag: "shift-reminder-test",
        data: { url: window.location.href },
      });

      setMessage("Notificacao de teste enviada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel enviar a notificacao de teste.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`push-reminder-control${message ? " has-message" : ""}`}>
      <div className="push-reminder-actions">
        <Button
          aria-label={enabled ? "Desativar lembretes" : "Ativar lembretes"}
          disabled={pending}
          onClick={() => void (enabled ? deactivate() : activate())}
          title={message || (enabled ? "Clique para desativar os lembretes" : label)}
          variant="ghost"
        >
          {enabled ? <Bell size={18} /> : <BellOff size={18} />}
          <span>{label}</span>
        </Button>
        {enabled && (
          <Button
            aria-label="Enviar notificacao de teste"
            disabled={pending}
            onClick={() => void sendTestNotification()}
            title="Enviar notificacao de teste"
            variant="ghost"
          >
            <Send size={18} />
            <span>Enviar teste</span>
          </Button>
        )}
      </div>
      <small aria-live="polite" role="status">
        {message || "Avisos: 24h e 90min antes, mesmo com o app fechado."}
      </small>
    </div>
  );
}
