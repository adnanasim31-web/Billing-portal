import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(255)
  .toLowerCase();

/** 10+ chars, at least one upper, one lower, one digit, one symbol - matches auth.minimum_password_length in supabase/config.toml */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number")
  .regex(/[^a-zA-Z0-9]/, "Include at least one symbol");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    organizationName: z.string().min(2, "Organization name is required").max(120),
    firstName: z.string().min(1, "First name is required").max(80),
    lastName: z.string().min(1, "Last name is required").max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    agreeToTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the Terms of Service" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "Code must be numeric"),
});
export type OtpInput = z.infer<typeof otpSchema>;

export const twoFactorSetupVerifySchema = z.object({
  code: z
    .string()
    .length(6, "Enter the 6-digit code from your authenticator app")
    .regex(/^\d{6}$/, "Code must be numeric"),
});
export type TwoFactorSetupVerifyInput = z.infer<typeof twoFactorSetupVerifySchema>;

export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  phone: z
    .string()
    .max(20)
    .regex(/^[+()\-.\s0-9]*$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  jobTitle: z.string().max(120).optional().or(z.literal("")),
  timezone: z.string().min(1),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const inviteUserSchema = z.object({
  email: emailSchema,
  roleId: z.string().uuid("Select a role"),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const createRoleSchema = z.object({
  name: z.string().min(2, "Role name is required").max(80),
  description: z.string().max(255).optional().or(z.literal("")),
  permissionIds: z.array(z.string().uuid()).min(1, "Select at least one permission"),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
