import type { ApiError } from '@event-buddy/contracts'

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export function errorBody(error: unknown): ApiError {
  return error instanceof HttpError
    ? { code: error.code, message: error.message }
    : { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' }
}

export function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, 'INVALID_INPUT', `${field} must contain 1–${maxLength} characters.`)
  }
  return value.trim()
}
