import { z } from 'zod'

export const setParticipationBodySchema = z.object({
  status: z.enum(['interested', 'going', 'withdrawn']),
})

export const participantsQuerySchema = z.object({
  status: z.enum(['interested', 'going', 'withdrawn']).optional(),
  countOnly: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => value === true || value === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const meEventsQuerySchema = z.object({
  role: z.enum(['hosted', 'attending']).optional(),
  status: z.enum(['interested', 'going', 'withdrawn']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type SetParticipationBody = z.infer<typeof setParticipationBodySchema>
export type ParticipantsQuery = z.infer<typeof participantsQuerySchema>
export type MeEventsQuery = z.infer<typeof meEventsQuerySchema>
