import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject = Deno.env.get("VAPID_SUBJECT");
const cronSecret = Deno.env.get("CRON_SECRET");
const webAppUrl = Deno.env.get("WEB_APP_URL") || "https://murilocsn.github.io/app-plantoes/";
const configuredReminderWindowMinutes = Number(Deno.env.get("REMINDER_WINDOW_MINUTES") || "10");
const reminderWindowMinutes =
  Number.isFinite(configuredReminderWindowMinutes) && configuredReminderWindowMinutes > 0
    ? configuredReminderWindowMinutes
    : 10;
const timeZone = "America/Sao_Paulo";

if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject || !cronSecret) {
  throw new Error("Missing notification environment variables.");
}

const admin = createClient(supabaseUrl, serviceRoleKey);
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

type Shift = {
  id: string;
  user_id: string;
  date: string;
  start_time: string | null;
  location_name: string | null;
};

type ReminderKind = "24h" | "90m";

type ReminderCandidate = {
  kind: ReminderKind;
  shift: Shift;
};

type Subscription = {
  id: string | number;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type ReminderDelivery = {
  user_id: string;
  shift_id: string;
  reminder_kind: ReminderKind;
};

const reminderRules: Array<{ kind: ReminderKind; minutesBefore: number }> = [
  { kind: "24h", minutesBefore: 24 * 60 },
  { kind: "90m", minutesBefore: 90 },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function dateToDayNumber(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function dayNumberToDate(dayNumber: number) {
  return new Date(dayNumber * 86_400_000).toISOString().slice(0, 10);
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function minutesToTime(value: number) {
  return `${pad2(Math.floor(value / 60))}:${pad2(value % 60)}`;
}

function timeToMinutes(value: string | null) {
  if (!value) {
    return null;
  }

  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function localNowInSaoPaulo() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(values.hour === "24" ? "00" : values.hour);
  const minuteOfDay = hour * 60 + Number(values.minute);

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    iso: now.toISOString(),
    label: `${values.year}-${values.month}-${values.day} ${minutesToTime(minuteOfDay)}`,
    minuteOfDay,
  };
}

function localInstant(date: string, startTime: string | null) {
  const minutes = timeToMinutes(startTime);
  if (minutes === null) {
    return null;
  }

  return dateToDayNumber(date) * 1440 + minutes;
}

function timeLabel(value: string | null) {
  return value ? value.slice(0, 5) : "Horario nao informado";
}

function locationLabel(value: string | null) {
  return value || "Unidade nao informada";
}

function notificationPayload(candidate: ReminderCandidate) {
  const time = timeLabel(candidate.shift.start_time);
  const location = locationLabel(candidate.shift.location_name);

  if (candidate.kind === "24h") {
    return {
      title: `Plantao amanha as ${time}`,
      body: location,
      tag: `shift-${candidate.shift.id}-24h`,
      url: webAppUrl,
    };
  }

  return {
    title: "Plantao em 90 minutos",
    body: `${time} - ${location}`,
    tag: `shift-${candidate.shift.id}-90m`,
    url: webAppUrl,
  };
}

function candidatesFor(shifts: Shift[], nowInstant: number) {
  const candidates: ReminderCandidate[] = [];

  for (const shift of shifts) {
    const shiftInstant = localInstant(shift.date, shift.start_time);
    if (shiftInstant === null) {
      continue;
    }

    for (const rule of reminderRules) {
      const windowStart = nowInstant + rule.minutesBefore;
      const windowEnd = windowStart + reminderWindowMinutes;

      if (shiftInstant >= windowStart && shiftInstant < windowEnd) {
        candidates.push({ kind: rule.kind, shift });
      }
    }
  }

  return candidates;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (request.headers.get("x-cron-secret") !== cronSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const localNow = localNowInSaoPaulo();
  const nowInstant = dateToDayNumber(localNow.date) * 1440 + localNow.minuteOfDay;
  const minTarget = Math.min(...reminderRules.map((rule) => nowInstant + rule.minutesBefore));
  const maxTarget = Math.max(
    ...reminderRules.map((rule) => nowInstant + rule.minutesBefore + reminderWindowMinutes),
  );
  const fromDate = dayNumberToDate(Math.floor(minTarget / 1440));
  const toDate = dayNumberToDate(Math.floor(maxTarget / 1440));

  const { data: shifts, error: shiftsError } = await admin
    .from("shifts")
    .select("id,user_id,date,start_time,location_name")
    .eq("status", "scheduled")
    .not("start_time", "is", null)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date")
    .order("start_time");

  if (shiftsError) {
    return jsonResponse({ error: shiftsError.message }, 500);
  }

  const candidates = candidatesFor((shifts ?? []) as Shift[], nowInstant);

  if (!candidates.length) {
    return jsonResponse({
      local_now: localNow.label,
      checked_from: fromDate,
      checked_to: toDate,
      candidates: 0,
      sent_notifications: 0,
      sent_reminders: 0,
      removed_subscriptions: 0,
      errors: [],
    });
  }

  const shiftIds = [...new Set(candidates.map((candidate) => candidate.shift.id))];
  const { data: sentDeliveries, error: deliveriesError } = await admin
    .from("push_reminder_deliveries")
    .select("shift_id,reminder_kind")
    .in("shift_id", shiftIds);

  if (deliveriesError) {
    return jsonResponse({ error: deliveriesError.message }, 500);
  }

  const sentKeys = new Set(
    ((sentDeliveries ?? []) as Array<{ shift_id: string; reminder_kind: ReminderKind }>).map(
      (delivery) => `${delivery.shift_id}:${delivery.reminder_kind}`,
    ),
  );
  const pendingCandidates = candidates.filter(
    (candidate) => !sentKeys.has(`${candidate.shift.id}:${candidate.kind}`),
  );

  if (!pendingCandidates.length) {
    return jsonResponse({
      local_now: localNow.label,
      checked_from: fromDate,
      checked_to: toDate,
      candidates: candidates.length,
      pending_candidates: 0,
      sent_notifications: 0,
      sent_reminders: 0,
      removed_subscriptions: 0,
      errors: [],
    });
  }

  const userIds = [...new Set(pendingCandidates.map((candidate) => candidate.shift.user_id))];
  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .in("user_id", userIds);

  if (subscriptionsError) {
    return jsonResponse({ error: subscriptionsError.message }, 500);
  }

  const subscriptionsByUser = new Map<string, Subscription[]>();
  for (const subscription of (subscriptions ?? []) as Subscription[]) {
    subscriptionsByUser.set(subscription.user_id, [
      ...(subscriptionsByUser.get(subscription.user_id) ?? []),
      subscription,
    ]);
  }

  let sentNotifications = 0;
  let removedSubscriptions = 0;
  const delivered: ReminderDelivery[] = [];
  const errors: string[] = [];

  for (const candidate of pendingCandidates) {
    const userSubscriptions = subscriptionsByUser.get(candidate.shift.user_id) ?? [];
    let sentForReminder = 0;
    const payload = notificationPayload(candidate);

    for (const subscription of userSubscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
        sentNotifications += 1;
        sentForReminder += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", subscription.id);
          removedSubscriptions += 1;
        } else {
          errors.push(error instanceof Error ? error.message : "Unknown push error");
        }
      }
    }

    if (sentForReminder > 0) {
      delivered.push({
        user_id: candidate.shift.user_id,
        shift_id: candidate.shift.id,
        reminder_kind: candidate.kind,
      });
    }
  }

  if (delivered.length) {
    const { error: insertError } = await admin
      .from("push_reminder_deliveries")
      .upsert(delivered, { onConflict: "shift_id,reminder_kind" });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }
  }

  return jsonResponse({
    local_now: localNow.label,
    checked_from: fromDate,
    checked_to: toDate,
    candidates: candidates.length,
    pending_candidates: pendingCandidates.length,
    sent_notifications: sentNotifications,
    sent_reminders: delivered.length,
    removed_subscriptions: removedSubscriptions,
    errors,
  });
});
