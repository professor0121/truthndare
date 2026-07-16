import { z } from "zod";

const createRoomSchema = z.object({
  body: z.object({
    maxPlayers: z
      .number()
      .min(2, { message: "Room must allow at least 2 players." })
      .max(20, { message: "Room cannot exceed 20 players." })
      .optional(),
    visibility: z
      .enum(["public", "private"], {
        errorMap: () => ({ message: "Visibility must be either 'public' or 'private'." })
      })
      .optional()
  })
});

const joinRoomSchema = z.object({
  body: z.object({
    code: z
      .string({ required_error: "Room code is required." })
      .trim()
      .length(6, { message: "Room code must be exactly 6 characters long." })
      .regex(/^[a-zA-Z0-9]+$/, { message: "Room code can only contain alphanumeric characters." })
  })
});

export { createRoomSchema, joinRoomSchema };
