import { z } from "zod";

export const CRM_LEAD_STAGES = ["lead", "qualified", "proposal", "contract_sent", "client", "lost"] as const;
export const CRM_LEAD_SOURCES = ["referral", "website", "cold_outreach", "conference", "other"] as const;
export const CRM_ACTIVITY_TYPES = ["call", "email", "meeting", "note"] as const;

export const crmLeadSchema = z.object({
  contactName: z.string().min(1, "Contact name is required").max(200),
  companyName: z.string().max(200).optional().or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  stage: z.enum(CRM_LEAD_STAGES).default("lead"),
  estimatedValue: z.number().min(0).max(99_999_999).optional(),
  source: z.enum(CRM_LEAD_SOURCES).default("other"),
  ownerId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
export type CrmLeadInput = z.infer<typeof crmLeadSchema>;

export const crmActivitySchema = z.object({
  activityType: z.enum(CRM_ACTIVITY_TYPES).default("note"),
  body: z.string().min(1, "Activity note is required").max(2000),
});
export type CrmActivityInput = z.infer<typeof crmActivitySchema>;

export const crmSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  stage: z.enum([...CRM_LEAD_STAGES, "all"]).default("all"),
});
export type CrmSearchInput = z.infer<typeof crmSearchSchema>;
