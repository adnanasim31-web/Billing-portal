import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registerSchema,
  passwordSchema,
  otpSchema,
  changePasswordSchema,
  createRoleSchema,
} from "@/lib/validations/auth";

describe("passwordSchema", () => {
  it("rejects passwords shorter than 10 characters", () => {
    expect(passwordSchema.safeParse("Ab1!").success).toBe(false);
  });

  it("rejects passwords missing a symbol", () => {
    expect(passwordSchema.safeParse("Abcdefgh12").success).toBe(false);
  });

  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("Str0ng!Passw0rd").success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("requires a valid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid login payload", () => {
    const result = loginSchema.safeParse({
      email: "user@practice.com",
      password: "anything",
      rememberMe: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("registerSchema", () => {
  const base = {
    organizationName: "Westlake Medical Group",
    firstName: "Rachel",
    lastName: "Adams",
    email: "rachel@westlake.com",
    password: "Str0ng!Passw0rd",
    confirmPassword: "Str0ng!Passw0rd",
    agreeToTerms: true as const,
  };

  it("accepts a fully valid registration payload", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: "Different1!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
    }
  });

  it("rejects when terms are not accepted", () => {
    const result = registerSchema.safeParse({ ...base, agreeToTerms: false });
    expect(result.success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("requires exactly 6 numeric digits", () => {
    expect(otpSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(otpSchema.safeParse({ code: "abcdef" }).success).toBe(false);
    expect(otpSchema.safeParse({ code: "123456" }).success).toBe(true);
  });
});

describe("changePasswordSchema", () => {
  it("rejects mismatched new/confirm passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPassw0rd!",
      newPassword: "NewPassw0rd!1",
      confirmPassword: "Different1!",
    });
    expect(result.success).toBe(false);
  });
});

describe("createRoleSchema", () => {
  it("requires at least one permission", () => {
    const result = createRoleSchema.safeParse({ name: "Custom Role", permissionIds: [] });
    expect(result.success).toBe(false);
  });
});
