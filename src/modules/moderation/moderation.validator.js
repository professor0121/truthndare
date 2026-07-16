import { z } from "zod";

const createReportSchema = z.object({
  body: z.object({
    reportedUserId: z
      .string({ required_error: "Reported user ID is required." })
      .trim(),
    contentType: z
      .enum(["chat", "question"], {
        errorMap: () => ({ message: "Content type must be 'chat' or 'question'." })
      }),
    contentId: z
      .string()
      .trim()
      .optional()
      .nullable(),
    contentPreview: z
      .string({ required_error: "Content preview is required." })
      .trim()
      .min(1, { message: "Content preview cannot be empty." }),
    reason: z
      .string({ required_error: "Reason is required." })
      .trim()
      .min(3, { message: "Reason must be at least 3 characters." })
      .max(200, { message: "Reason cannot exceed 200 characters." })
  })
});

const resolveReportSchema = z.object({
  body: z.object({
    action: z
      .enum(["dismiss", "mute", "ban", "delete_content"], {
        errorMap: () => ({ message: "Action must be 'dismiss', 'mute', 'ban', or 'delete_content'." })
      })
  })
});

export { createReportSchema, resolveReportSchema };
