import { z } from "zod";

export const providerMessageSchema = z.object({
  body: z.string().min(1, "Message cannot be empty").max(4000),
});
export type ProviderMessageInput = z.infer<typeof providerMessageSchema>;
