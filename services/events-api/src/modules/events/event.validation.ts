import { z } from 'zod'

const isoDateTime = z.string().datetime({ offset: true })

export const eventIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Event id must be a positive integer'),
})

export const eventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  startDate: isoDateTime.optional(),
  endDate: isoDateTime.optional(),
  location: z.string().trim().min(1).optional(),
  status: z.enum(['scheduled', 'cancelled']).default('scheduled'),
  sortBy: z.enum(['startsAt', 'createdAt', 'title']).default('startsAt'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export const createEventBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(10_000),
    startsAt: isoDateTime,
    endsAt: isoDateTime.optional(),
    locationName: z.string().trim().min(1).max(300),
    address: z.string().trim().min(1).max(500).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    priceAmount: z.number().min(0).optional(),
    capacity: z.number().int().positive().optional(),
    categoryNames: z.array(z.string().trim().min(1)).default([]),
    organizingGroupId: z.string().regex(/^\d+$/).optional(),
    imageObjectKey: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endsAt && value.endsAt <= value.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'endsAt must be after startsAt',
      })
    }
  })

export const updateEventBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(10_000).optional(),
    startsAt: isoDateTime.optional(),
    endsAt: isoDateTime.nullable().optional(),
    locationName: z.string().trim().min(1).max(300).optional(),
    address: z.string().trim().min(1).max(500).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    priceAmount: z.number().min(0).nullable().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    categoryNames: z.array(z.string().trim().min(1)).optional(),
    organizingGroupId: z.string().regex(/^\d+$/).nullable().optional(),
    imageObjectKey: z.string().trim().min(1).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
  .superRefine((value, ctx) => {
    if (value.startsAt && value.endsAt && value.endsAt !== null && value.endsAt <= value.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'endsAt must be after startsAt',
      })
    }
  })

export type EventListQueryInput = z.infer<typeof eventListQuerySchema>
export type CreateEventBody = z.infer<typeof createEventBodySchema>
export type UpdateEventBody = z.infer<typeof updateEventBodySchema>
