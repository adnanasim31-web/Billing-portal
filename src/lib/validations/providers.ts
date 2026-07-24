import { z } from "zod";

const optionalPhone = z
  .string()
  .max(20)
  .regex(/^[+()\-.\s0-9]*$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const providerSchema = z
  .object({
    providerType: z.enum(["individual", "organization"]).default("individual"),
    firstName: z.string().max(80).optional().or(z.literal("")),
    lastName: z.string().max(80).optional().or(z.literal("")),
    credentialSuffix: z.string().max(20).optional().or(z.literal("")),
    organizationName: z.string().max(160).optional().or(z.literal("")),
    npi: z
      .string()
      .regex(/^\d{10}$/, "NPI must be exactly 10 digits"),
    taxId: z
      .string()
      .regex(/^\d{2}-?\d{7}$/, "Enter a valid Tax ID (EIN), e.g. 12-3456789")
      .optional()
      .or(z.literal("")),
    specialty: z.string().min(1, "Specialty is required").max(120),
    taxonomyCode: z.string().max(20).optional().or(z.literal("")),
    licenseNumber: z.string().max(40).optional().or(z.literal("")),
    licenseState: z.string().max(2).optional().or(z.literal("")),
    deaNumber: z
      .string()
      .regex(/^[A-Za-z]{2}\d{7}$/, "DEA number must be 2 letters followed by 7 digits")
      .optional()
      .or(z.literal("")),
    email: z.string().email("Enter a valid email").optional().or(z.literal("")),
    phone: optionalPhone,
    status: z.enum(["active", "inactive", "pending"]).default("active"),
  })
  .superRefine((data, ctx) => {
    if (data.providerType === "individual") {
      if (!data.firstName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "First name is required", path: ["firstName"] });
      }
      if (!data.lastName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Last name is required", path: ["lastName"] });
      }
    } else if (!data.organizationName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Organization name is required",
        path: ["organizationName"],
      });
    }
  });
export type ProviderInput = z.infer<typeof providerSchema>;

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const providerScheduleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(timePattern, "Use 24-hour HH:MM format"),
    endTime: z.string().regex(timePattern, "Use 24-hour HH:MM format"),
    location: z.string().max(160).optional().or(z.literal("")),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });
export type ProviderScheduleInput = z.infer<typeof providerScheduleSchema>;

export const providerSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "pending", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
});
export type ProviderSearchInput = z.infer<typeof providerSearchSchema>;
