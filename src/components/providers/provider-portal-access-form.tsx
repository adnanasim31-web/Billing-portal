"use client";

import * as React from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormItem, FormLabel } from "@/components/ui/form";

export interface ProviderPortalAccessStatus {
  state: "none" | "active";
  email?: string;
  lastLoginAt?: string | null;
}

export interface ProviderPortalCredentialsValue {
  email: string;
  password: string;
}

interface ProviderPortalAccessFormProps {
  status: ProviderPortalAccessStatus;
  value: ProviderPortalCredentialsValue;
  onChange: (value: ProviderPortalCredentialsValue) => void;
}

/**
 * Staff set a provider's portal login directly (email + password) rather
 * than through an emailed invite link - unlike the patient portal, there is
 * no token/activation step, so the fields live right on the same
 * add/edit-provider form instead of a separate "send invite" action.
 */
export function ProviderPortalAccessForm({ status, value, onChange }: ProviderPortalAccessFormProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Provider portal access</CardTitle>
        <CardDescription>
          Lets this provider sign in separately to view their appointment schedule, claims, and credentialing
          status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.state === "active" && (
          <div className="flex items-center gap-2">
            <Badge variant="success">
              <ShieldCheck className="h-3 w-3" />
              Active
            </Badge>
            <span className="text-sm text-muted-foreground">
              {status.lastLoginAt
                ? `Last signed in ${new Date(status.lastLoginAt).toLocaleString()}`
                : "Hasn't signed in yet"}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormItem>
            <FormLabel>Portal email</FormLabel>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                className="pl-9"
                autoComplete="off"
                value={value.email}
                onChange={(e) => onChange({ ...value, email: e.target.value })}
              />
            </div>
          </FormItem>
          <FormItem>
            <FormLabel>{status.state === "active" ? "New password (optional)" : "Password"}</FormLabel>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                className="pl-9 pr-9"
                autoComplete="new-password"
                placeholder={status.state === "active" ? "Leave blank to keep current password" : undefined}
                value={value.password}
                onChange={(e) => onChange({ ...value, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormItem>
        </div>
        <p className="text-xs text-muted-foreground">
          {status.state === "active"
            ? "This is used to change the provider's login email or reset their password - the provider will see whatever password you set here, so share it with them directly."
            : "10+ characters with a mix of upper/lowercase, a number, and a symbol. The provider will see this password, so share it with them directly."}
        </p>
      </CardContent>
    </Card>
  );
}
