import { z } from 'zod'

const optionalNullableText = (maximumLength: number) =>
  z.string().trim().max(maximumLength).nullable().optional()

const preferredCategoriesSchema = z
  .array(z.string().trim().min(1).max(100))
  .max(20)
  .transform((categories) => [...new Set(categories)])

const profileFields = {
  displayName: z.string().trim().min(1).max(100),
  affiliation: optionalNullableText(200),
  ageRange: z
    .enum(['under_18', '18_24', '25_34', '35_44', '45_plus'])
    .nullable()
    .optional(),
  bio: optionalNullableText(1_000),
}

export const profileUserIdParamSchema = z.object({
  id: z.string().trim().min(1).max(128),
})

export const createProfileBodySchema = z.object({
  ...profileFields,
  preferredCategories: preferredCategoriesSchema.default([]),
})

export const updateProfileBodySchema = z
  .object({
    displayName: profileFields.displayName.optional(),
    affiliation: profileFields.affiliation,
    ageRange: profileFields.ageRange,
    bio: profileFields.bio,
    preferredCategories: preferredCategoriesSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field is required',
  })

export type CreateProfileBody = z.infer<typeof createProfileBodySchema>
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>
