import { settingsInputSchema } from "@financplantoes/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { expectData, optionalData } from "../lib/db";
import { ok } from "../lib/respond";

export const settingsRouter = Router();

settingsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const settings = await optionalData<{ monthly_goal: number } | null>(
      request.auth.supabase
        .from("settings")
        .select("monthly_goal")
        .eq("user_id", request.auth.user.id)
        .maybeSingle(),
      null,
    );

    ok(response, settings ?? { monthly_goal: 0 });
  }),
);

settingsRouter.put(
  "/",
  asyncHandler(async (request, response) => {
    const input = settingsInputSchema.parse(request.body);
    const settings = await expectData<{ monthly_goal: number }>(
      request.auth.supabase
        .from("settings")
        .upsert({
          user_id: request.auth.user.id,
          monthly_goal: input.monthly_goal,
          updated_at: new Date().toISOString(),
        })
        .select("monthly_goal")
        .single(),
    );

    ok(response, settings);
  }),
);
