import { z } from "zod";

export const channelSchema = z.object({
  name: z.string().min(1, "Channel name is required").max(80),
  description: z.string().max(300).optional().or(z.literal("")),
});
export type ChannelInput = z.infer<typeof channelSchema>;

export const messageSchema = z.object({
  body: z.string().min(1, "Message cannot be empty").max(4000),
});
export type MessageInput = z.infer<typeof messageSchema>;
