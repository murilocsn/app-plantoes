import { idParamSchema, spaceInputSchema, type Space } from "@financplantoes/shared";
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { asyncHandler } from "../lib/async-handler";
import { expectData, optionalData } from "../lib/db";
import { HttpError } from "../lib/http-error";
import { ok } from "../lib/respond";

export const spacesRouter = Router();

spacesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const membershipRows = await optionalData<Array<{ role: string; spaces: Space | null }>>(
      request.auth.supabase
        .from("space_members")
        .select("role,spaces(id,name,space_type,description,start_date,end_date,archived,owner_id)")
        .eq("user_id", request.auth.user.id)
        .eq("status", "active"),
      [],
    );

    const spaces = membershipRows
      .filter((row) => row.spaces && row.spaces.archived !== true)
      .map((row) => ({
        ...row.spaces,
        role: row.role,
      }));

    ok(response, spaces);
  }),
);

spacesRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const input = spaceInputSchema.parse(request.body);
    const id = randomUUID();
    const space = await expectData<Space>(
      request.auth.supabase
        .from("spaces")
        .insert({
          id,
          owner_id: request.auth.user.id,
          archived: false,
          ...input,
        })
        .select("id,name,space_type,description,start_date,end_date,archived,owner_id")
        .single(),
    );

    await expectData(
      request.auth.supabase.from("space_members").insert({
        space_id: id,
        user_id: request.auth.user.id,
        role: "owner",
        status: "active",
      }),
    );

    ok(response, { ...space, role: "owner" }, 201);
  }),
);

spacesRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const { id } = idParamSchema.parse(request.params);
    const input = spaceInputSchema.partial().parse(request.body);
    const space = await expectData<Space>(
      request.auth.supabase
        .from("spaces")
        .update(input)
        .eq("id", id)
        .eq("owner_id", request.auth.user.id)
        .select("id,name,space_type,description,start_date,end_date,archived,owner_id")
        .single(),
    );

    ok(response, { ...space, role: "owner" });
  }),
);

spacesRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const { id } = idParamSchema.parse(request.params);
    const space = await expectData<Space>(
      request.auth.supabase
        .from("spaces")
        .select("id,owner_id")
        .eq("id", id)
        .single(),
      "Espaco nao encontrado.",
    );

    if (space.owner_id !== request.auth.user.id) {
      throw new HttpError(403, "Somente o proprietario pode remover este espaco.", "SPACE_OWNER_ONLY");
    }

    const deleted = await request.auth.supabase
      .from("spaces")
      .delete()
      .eq("id", id)
      .eq("owner_id", request.auth.user.id);

    if (deleted.error) {
      await expectData(
        request.auth.supabase
          .from("spaces")
          .update({ archived: true })
          .eq("id", id)
          .eq("owner_id", request.auth.user.id),
      );
      ok(response, { id, archived: true });
      return;
    }

    ok(response, { id });
  }),
);
