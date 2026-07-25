import { z } from "zod";

export const createNewsSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(5),
  imageUrl: z.string().url().optional(),
  schoolId: z.string().uuid().optional(),
});

export const updateNewsSchema = createNewsSchema.partial();
