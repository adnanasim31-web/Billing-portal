import { z } from "zod";
import { emailSchema, passwordSchema } from "@/lib/validations/auth";

export const patientPortalLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type PatientPortalLoginInput = z.infer<typeof patientPortalLoginSchema>;

export const patientPortalAcceptInviteSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type PatientPortalAcceptInviteInput = z.infer<typeof patientPortalAcceptInviteSchema>;

export const patientPortalPaymentSchema = z.object({
  amount: z.number().positive("Enter an amount greater than zero").max(999_999.99),
});
export type PatientPortalPaymentInput = z.infer<typeof patientPortalPaymentSchema>;
