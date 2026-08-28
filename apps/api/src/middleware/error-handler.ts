import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { isHttpError } from "../lib/http-error";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(422).json({
      error: {
        message: "Dados invalidos.",
        code: "VALIDATION_ERROR",
        details: error.flatten(),
      },
    });
    return;
  }

  if (isHttpError(error)) {
    response.status(error.status).json({
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      message: "Erro interno ao processar a requisicao.",
      code: "INTERNAL_ERROR",
      details: env.NODE_ENV === "development" ? String(error) : undefined,
    },
  });
};
