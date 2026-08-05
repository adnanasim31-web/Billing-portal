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

const optionalPortalPhone = z
  .string()
  .max(20)
  .regex(/^[+()\-.\s0-9]*$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));

// Deliberately narrow - name, date of birth, and email are the patient's
// identity as it appears on claims and are staff-managed only. This covers
// just the contact details a patient would otherwise have to call in to
// update.
export const patientPortalProfileSchema = z.object({
  phoneMobile: optionalPortalPhone,
  phoneHome: optionalPortalPhone,
  addressLine1: z.string().max(255).optional().or(z.literal("")),
  addressLine2: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  state: z.string().max(2).optional().or(z.literal("")),
  postalCode: z.string().max(10).optional().or(z.literal("")),
});
export type PatientPortalProfileInput = z.infer<typeof patientPortalProfileSchema>;
