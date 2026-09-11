import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject = Deno.env.get("VAPID_SUBJECT");
const cronSecret = Deno.env.get("CRON_SECRET");
const webAppUrl = Deno.env.get("WEB_APP_URL") || "https://murilocsn.github.io/app-plantoes/";

if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject || !cronSecret) {
  throw new Error("Missing notification environment variables.");
}

const admin = createClient(supabaseUrl, serviceRoleKey);
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

type Shift = {
  user_id: string;
  date: string;
  start_time: string | null;
  location_name: string | null;
};

type Subscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function tomorrowInSaoPaulo() {
  const now = new Date();
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = localDate.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  return tomorrow.toISOString().slice(0, 10);
}

function timeLabel(value: string | null) {
  return value ? value.slice(0, 5) : "Horário não informado";
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const date = tomorrowInSaoPaulo();
  const { data: shifts, error: shiftsError } = await admin
    .from("shifts")
    .select("user_id,date,start_time,location_name")
    .eq("date", date)
    .eq("status", "scheduled")
    .order("start_time");

  if (shiftsError) {
    return new Response(JSON.stringify({ error: shiftsError.message }), { status: 500 });
  }

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth");

  if (subscriptionsError) {
    return new Response(JSON.stringify({ error: subscriptionsError.message }), { status: 500 });
  }

  const shiftsByUser = new Map<string, Shift[]>();
  for (const shift of (shifts ?? []) as Shift[]) {
    shiftsByUser.set(shift.user_id, [...(shiftsByUser.get(shift.user_id) ?? []), shift]);
  }

  let sent = 0;
  let removed = 0;
  const errors: string[] = [];

  for (const subscription of (subscriptions ?? []) as Subscription[]) {
    const userShifts = shiftsByUser.get(subscription.user_id);
    if (!userShifts?.length) {
      continue;
    }

    const body = userShifts
      .map((shift) => `${timeLabel(shift.start_time)} - ${shift.location_name || "Unidade não informada"}`)
      .join("\n");

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify({
          title: "Plantões de amanhã",
          body,
          url: webAppUrl,
        }),
      );
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
        removed += 1;
      } else {
        errors.push(error instanceof Error ? error.message : "Unknown push error");
      }
    }
  }

  return new Response(
    JSON.stringify({ date, users: shiftsByUser.size, sent, removed, errors }),
    { headers: { "Content-Type": "application/json" } },
  );
});
