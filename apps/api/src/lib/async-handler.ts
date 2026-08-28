import type { NextFunction, Request, Response } from "express";

type AsyncRoute = (request: Request, response: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(route: AsyncRoute) {
  return (request: Request, response: Response, next: NextFunction) => {
    void route(request, response, next).catch(next);
  };
}
