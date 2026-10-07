import { aiChatInputSchema } from "@financplantoes/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { hasEmergencySignal, retrieveMedicalSources } from "../lib/medical-rag";
import { generateMedicalAnswer } from "../lib/openai-chat";
import { ok } from "../lib/respond";

export const aiRouter = Router();

aiRouter.post(
  "/chat",
  asyncHandler(async (request, response) => {
    const input = aiChatInputSchema.parse(request.body);
    const emergency = hasEmergencySignal(input.question);
    const sources = retrieveMedicalSources(input.question);
    const answer = await generateMedicalAnswer({
      question: input.question,
      history: input.history,
      sources,
      emergency,
    });

    ok(response, {
      answer: answer.answer,
      safetyNotice: answer.safetyNotice,
      sources,
      mode: answer.mode,
      model: answer.model,
      generatedAt: new Date().toISOString(),
      emergency,
    });
  }),
);
