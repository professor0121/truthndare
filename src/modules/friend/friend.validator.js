import { z } from "zod";

const friendRequestSchema = z.object({
  body: z.object({
    recipientUsername: z
      .string({ required_error: "Recipient username is required." })
      .trim()
      .min(3, { message: "Username must be at least 3 characters." })
      .max(20, { message: "Username cannot exceed 20 characters." })
  })
});

const acceptDeclineRequestSchema = z.object({
  body: z.object({
    requesterId: z
      .string({ required_error: "Requester ID is required." })
      .trim()
  })
});

const inviteFriendSchema = z.object({
  body: z.object({
    friendUserId: z
      .string({ required_error: "Friend user ID is required." })
      .trim(),
    roomCode: z
      .string({ required_error: "Room code is required." })
      .trim()
      .length(6, { message: "Room code must be exactly 6 characters." })
  })
});

export {
  friendRequestSchema,
  acceptDeclineRequestSchema,
  inviteFriendSchema
};
