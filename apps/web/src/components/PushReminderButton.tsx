import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Button } from "./Button";

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function base64ToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushReminderButton() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

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

    if (!vapidPublicKey) {
      setMessage("Configure VITE_VAPID_PUBLIC_KEY para ativar os lembretes.");
      return;
    }

    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setMessage("Este navegador não suporta notificações Push.");
      return;
    }

    setPending(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permissão de notificação não concedida.");
      }

      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw.js`,
      );
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToBytes(vapidPublicKey),
        }));
      const json = subscription.toJSON();
      const keys = json.keys;

      if (!json.endpoint || !keys?.p256dh || !keys.auth) {
        throw new Error("Não foi possível obter os dados da inscrição Push.");
      }

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
      setMessage(error instanceof Error ? error.message : "Não foi possível ativar os lembretes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="push-reminder-control">
      <Button disabled={pending || enabled} onClick={() => void activate()} variant="ghost">
        {enabled ? <Bell size={18} /> : <BellOff size={18} />}
        <span>{enabled ? "Lembretes ativos" : "Ativar lembretes"}</span>
      </Button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}