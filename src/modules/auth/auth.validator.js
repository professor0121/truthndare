import { z } from "zod";

const registerSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .email({ message: "Invalid email format." }),
    username: z
      .string({ required_error: "Username is required." })
      .trim()
      .min(3, { message: "Username must be at least 3 characters long." })
      .max(20, { message: "Username cannot exceed 20 characters." })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Username can only contain alphanumeric characters and underscores."
      }),
    password: z
      .string({ required_error: "Password is required." })
      .min(6, { message: "Password must be at least 6 characters long." })
  })
});

const loginSchema = z.object({
  body: z.object({
    identifier: z
      .string({ required_error: "Email or username is required." })
      .trim()
      .min(1, { message: "Email or username cannot be empty." }),
    password: z
      .string({ required_error: "Password is required." })
      .min(1, { message: "Password cannot be empty." })
  })
});

const convertGuestSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .email({ message: "Invalid email format." }),
    username: z
      .string({ required_error: "Username is required." })
      .trim()
      .min(3, { message: "Username must be at least 3 characters long." })
      .max(20, { message: "Username cannot exceed 20 characters." })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Username can only contain alphanumeric characters and underscores."
      }),
    password: z
      .string({ required_error: "Password is required." })
      .min(6, { message: "Password must be at least 6 characters long." })
  })
});

export { registerSchema, loginSchema, convertGuestSchema };
