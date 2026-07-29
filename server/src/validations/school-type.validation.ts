import { z } from "zod";

export const createSchoolTypeSchema = z.object({
  name: z.string().min(2, "Le nom doit comporter au moins 2 caractères"),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateSchoolTypeSchema = createSchoolTypeSchema.partial();
