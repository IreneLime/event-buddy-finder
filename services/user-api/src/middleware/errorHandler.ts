import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { ApiError } from '../utils/ApiError.js'

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      error: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    })
    return
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: 'Validation failed',
      details: error.flatten(),
    })
    return
  }

  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
}
