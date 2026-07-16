import { z } from "zod";

const createQuestionSchema = z.object({
  body: z.object({
    text: z
      .string({ required_error: "Question text is required." })
      .trim()
      .min(5, { message: "Question text must be at least 5 characters long." })
      .max(200, { message: "Question text cannot exceed 200 characters." }),
    type: z
      .enum(["truth", "dare"], {
        errorMap: () => ({ message: "Type must be either 'truth' or 'dare'." })
      }),
    difficulty: z
      .enum(["easy", "medium", "hard"], {
        errorMap: () => ({ message: "Difficulty must be 'easy', 'medium', or 'hard'." })
      })
      .optional(),
    category: z
      .enum(["funny", "personal", "embarrassing", "18+"], {
        errorMap: () => ({ message: "Category must be 'funny', 'personal', 'embarrassing', or '18+'." })
      })
      .optional(),
    language: z
      .string()
      .optional()
  })
});

const generateQuestionSchema = z.object({
  body: z.object({
    type: z
      .enum(["truth", "dare"], {
        errorMap: () => ({ message: "Type must be either 'truth' or 'dare'." })
      }),
    difficulty: z
      .enum(["easy", "medium", "hard"], {
        errorMap: () => ({ message: "Difficulty must be 'easy', 'medium', or 'hard'." })
      })
      .optional(),
    category: z
      .enum(["funny", "personal", "embarrassing", "18+"], {
        errorMap: () => ({ message: "Category must be 'funny', 'personal', 'embarrassing', or '18+'." })
      })
      .optional(),
    language: z
      .string()
      .optional()
  })
});

export { createQuestionSchema, generateQuestionSchema };
