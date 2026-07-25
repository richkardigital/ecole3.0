import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  link: z.string().url().optional(),
  classId: z.string().uuid().optional(),
});

export const updateMeetingSchema = createMeetingSchema.partial();
