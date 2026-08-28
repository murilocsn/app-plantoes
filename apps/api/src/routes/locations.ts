import { idParamSchema, locationInputSchema, type Location } from "@financplantoes/shared";
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { asyncHandler } from "../lib/async-handler";
import { expectData, optionalData } from "../lib/db";
import { ok } from "../lib/respond";

export const locationsRouter = Router();

locationsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const locations = await optionalData<Location[]>(
      request.auth.supabase
        .from("locations")
        .select("id,name,value12,doc,active,reference_start_day,reference_end_day,payment_due_day,payment_due_months_after,created_at")
        .eq("user_id", request.auth.user.id)
        .order("name", { ascending: true }),
      [],
    );

    ok(response, locations);
  }),
);

locationsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = locationInputSchema.parse(request.body);
    const location = await expectData<Location>(
      request.auth.supabase
        .from("locations")
        .insert({
          id: randomUUID(),
          user_id: request.auth.user.id,
          ...input,
          active: input.active ?? true,
        })
        .select("id,name,value12,doc,active,reference_start_day,reference_end_day,payment_due_day,payment_due_months_after,created_at")
        .single(),
    );

    ok(response, location, 201);
  }),
);

locationsRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const { id } = idParamSchema.parse(request.params);
    const input = locationInputSchema.partial().parse(request.body);
    const location = await expectData<Location>(
      request.auth.supabase
        .from("locations")
        .update(input)
        .eq("id", id)
        .eq("user_id", request.auth.user.id)
        .select("id,name,value12,doc,active,reference_start_day,reference_end_day,payment_due_day,payment_due_months_after,created_at")
        .single(),
    );

    ok(response, location);
  }),
);

locationsRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const { id } = idParamSchema.parse(request.params);

    await expectData(
      request.auth.supabase
        .from("locations")
        .update({ active: false })
        .eq("id", id)
        .eq("user_id", request.auth.user.id),
    );

    ok(response, { id, active: false });
  }),
);
