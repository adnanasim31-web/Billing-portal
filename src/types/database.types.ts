/**
 * Hand-authored mirror of supabase/migrations/*.sql for Module 1.
 * Once the Supabase project is linked, regenerate with `npm run db:types`
 * (supabase gen types typescript --linked) and this file becomes obsolete -
 * keep the shape identical so consuming code does not need to change.
 */

export type UserStatus = "invited" | "active" | "suspended" | "disabled";
export type TwoFactorMethod = "totp" | "email" | "sms";
export type OtpPurpose =
  | "email_verification"
  | "login_2fa"
  | "password_reset"
  | "phone_verification";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";
export type PatientSex = "male" | "female" | "other" | "unspecified";
export type PatientStatus = "active" | "inactive" | "deceased";
export type InsuranceRank = "primary" | "secondary" | "tertiary";
export type SubscriberRelationship = "self" | "spouse" | "child" | "other";
export type DocumentCategory =
  | "insurance_card"
  | "identification"
  | "consent_form"
  | "medical_record"
  | "referral"
  | "other";
export type MedicalHistoryType = "condition" | "allergy" | "medication" | "surgery" | "immunization";
export type MedicalHistoryStatus = "active" | "resolved" | "chronic";
export type PatientNoteType = "general" | "billing" | "clinical" | "collections";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          npi: string | null;
          tax_id: string | null;
          logo_url: string | null;
          phone: string | null;
          billing_email: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          timezone: string;
          is_active: boolean;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          avatar_url: string | null;
          job_title: string | null;
          status: UserStatus;
          is_super_admin: boolean;
          last_login_at: string | null;
          last_login_ip: string | null;
          failed_login_attempts: number;
          locked_until: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      roles: {
        Row: {
          id: string;
          organization_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["roles"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Row"]>;
      };
      permissions: {
        Row: {
          id: string;
          slug: string;
          module: string;
          label: string;
          description: string | null;
          created_at: string;
        };
        Relationships: [];
        Insert: Partial<Database["public"]["Tables"]["permissions"]["Row"]> & {
          slug: string;
          module: string;
          label: string;
        };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Row"]>;
      };
      role_permissions: {
        Row: { role_id: string; permission_id: string; created_at: string };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
        Insert: { role_id: string; permission_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Row"]>;
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          organization_id: string;
          assigned_by: string | null;
          assigned_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
        Insert: {
          user_id: string;
          role_id: string;
          organization_id: string;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Row"]>;
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role_id: string;
          invited_by: string | null;
          token_hash: string;
          status: InvitationStatus;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["invitations"]["Row"]> & {
          organization_id: string;
          email: string;
          role_id: string;
          token_hash: string;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Row"]>;
      };
      two_factor_auth: {
        Row: {
          user_id: string;
          method: TwoFactorMethod;
          secret: string | null;
          backup_codes: string[];
          is_enabled: boolean;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "two_factor_auth_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["two_factor_auth"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["two_factor_auth"]["Row"]>;
      };
      otp_codes: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          code_hash: string;
          purpose: OtpPurpose;
          attempts: number;
          max_attempts: number;
          expires_at: string;
          consumed_at: string | null;
          created_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "otp_codes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["otp_codes"]["Row"]> & {
          email: string;
          code_hash: string;
          purpose: OtpPurpose;
          expires_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["otp_codes"]["Row"]>;
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_token_hash: string;
          ip_address: string | null;
          user_agent: string | null;
          device_label: string | null;
          city: string | null;
          region: string | null;
          country: string | null;
          last_active_at: string;
          created_at: string;
          revoked_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["user_sessions"]["Row"]> & {
          user_id: string;
          session_token_hash: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_sessions"]["Row"]>;
      };
      login_attempts: {
        Row: {
          id: string;
          email: string;
          ip_address: string | null;
          success: boolean;
          reason: string | null;
          created_at: string;
        };
        Relationships: [];
        Insert: Partial<Database["public"]["Tables"]["login_attempts"]["Row"]> & {
          email: string;
          success: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["login_attempts"]["Row"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Record<string, unknown>;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          action: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
      };
      patients: {
        Row: {
          id: string;
          organization_id: string;
          mrn: string;
          first_name: string;
          last_name: string;
          middle_name: string | null;
          preferred_name: string | null;
          date_of_birth: string;
          sex: PatientSex;
          ssn_last4: string | null;
          email: string | null;
          phone_mobile: string | null;
          phone_home: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string;
          preferred_language: string;
          guarantor_patient_id: string | null;
          status: PatientStatus;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patients_guarantor_patient_id_fkey";
            columns: ["guarantor_patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["patients"]["Row"]> & {
          organization_id: string;
          mrn: string;
          first_name: string;
          last_name: string;
          date_of_birth: string;
        };
        Update: Partial<Database["public"]["Tables"]["patients"]["Row"]>;
      };
      patient_insurance_policies: {
        Row: {
          id: string;
          patient_id: string;
          organization_id: string;
          rank: InsuranceRank;
          payer_name: string;
          payer_id_code: string | null;
          plan_name: string | null;
          policy_number: string;
          group_number: string | null;
          subscriber_name: string;
          subscriber_dob: string | null;
          subscriber_relationship: SubscriberRelationship;
          effective_date: string | null;
          termination_date: string | null;
          copay_amount: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_insurance_policies_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["patient_insurance_policies"]["Row"]> & {
          patient_id: string;
          organization_id: string;
          rank: InsuranceRank;
          payer_name: string;
          policy_number: string;
          subscriber_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["patient_insurance_policies"]["Row"]>;
      };
      patient_documents: {
        Row: {
          id: string;
          patient_id: string;
          organization_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          category: DocumentCategory;
          uploaded_by: string | null;
          created_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["patient_documents"]["Row"]> & {
          patient_id: string;
          organization_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["patient_documents"]["Row"]>;
      };
      patient_medical_history: {
        Row: {
          id: string;
          patient_id: string;
          organization_id: string;
          entry_type: MedicalHistoryType;
          description: string;
          onset_date: string | null;
          status: MedicalHistoryStatus;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_medical_history_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["patient_medical_history"]["Row"]> & {
          patient_id: string;
          organization_id: string;
          entry_type: MedicalHistoryType;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["patient_medical_history"]["Row"]>;
      };
      patient_notes: {
        Row: {
          id: string;
          patient_id: string;
          organization_id: string;
          author_id: string | null;
          note_type: PatientNoteType;
          body: string;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_notes_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patient_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
        Insert: Partial<Database["public"]["Tables"]["patient_notes"]["Row"]> & {
          patient_id: string;
          organization_id: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["patient_notes"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_organization_id: { Args: Record<string, never>; Returns: string };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      has_permission: { Args: { permission_slug: string }; Returns: boolean };
      is_org_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
  };
}
