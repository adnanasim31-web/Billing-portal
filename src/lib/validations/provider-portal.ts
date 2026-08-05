import { z } from "zod";
import { emailSchema } from "@/lib/validations/auth";

export const providerPortalLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type ProviderPortalLoginInput = z.infer<typeof providerPortalLoginSchema>;
