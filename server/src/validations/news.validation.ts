import { z } from "zod";

export const createNewsSchema = z.object({
  title: z.string().min(2, "Le titre doit comporter au moins 2 caractères"),
  content: z.string().min(5, "Le contenu doit comporter au moins 5 caractères"),
  imageUrl: z.string().optional().nullable(),
  priority: z.enum(["INFO", "NORMAL", "URGENT", "FLASH"]).default("NORMAL"),
  isActive: z.boolean().default(true),
  targetRoles: z.array(z.string()).default(["ALL"]),
  targetSchoolIds: z.array(z.string()).default([]),
  schoolId: z.string().optional().nullable(),
  sendNotification: z.boolean().optional().default(true),
});

export const updateNewsSchema = createNewsSchema.partial();
