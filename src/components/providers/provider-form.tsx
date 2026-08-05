"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { providerPortalCredentialsSchema, providerSchema, type ProviderInput } from "@/lib/validations/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ProviderPortalAccessForm,
  type ProviderPortalAccessStatus,
  type ProviderPortalCredentialsValue,
} from "@/components/providers/provider-portal-access-form";

interface ProviderFormProps {
  providerId?: string;
  defaultValues?: Partial<ProviderInput>;
  portalAccessStatus?: ProviderPortalAccessStatus;
}

const EMPTY_DEFAULTS: ProviderInput = {
  providerType: "individual",
  firstName: "",
  lastName: "",
  credentialSuffix: "",
  organizationName: "",
  npi: "",
  taxId: "",
  specialty: "",
  taxonomyCode: "",
  licenseNumber: "",
  licenseState: "",
  deaNumber: "",
  email: "",
  phone: "",
  status: "active",
};

export function ProviderForm({ providerId, defaultValues, portalAccessStatus }: ProviderFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [portalCredentials, setPortalCredentials] = React.useState<ProviderPortalCredentialsValue>({
    email: portalAccessStatus?.email ?? "",
    password: "",
  });
  const isEdit = !!providerId;
  const resolvedPortalStatus: ProviderPortalAccessStatus = portalAccessStatus ?? { state: "none" };

  const form = useForm<ProviderInput>({
    resolver: zodResolver(providerSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  const providerType = form.watch("providerType");

  async function onSubmit(values: ProviderInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/providers/${providerId}` : "/api/providers", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Unable to save provider");
        return;
      }

      if (portalCredentials.email || portalCredentials.password) {
        const parsedCredentials = providerPortalCredentialsSchema.safeParse(portalCredentials);
        if (!parsedCredentials.success) {
          toast.error(parsedCredentials.error.issues[0]?.message ?? "Enter a valid portal email/password");
          return;
        }

        const portalRes = await fetch(`/api/providers/${data.id}/portal-access`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedCredentials.data),
        });
        const portalData = await portalRes.json().catch(() => ({}));
        if (!portalRes.ok) {
          toast.error(portalData.error ?? "Provider saved, but portal access couldn't be set up");
          router.push(`/providers/${data.id}`);
          router.refresh();
          return;
        }
      }

      toast.success(isEdit ? "Provider updated" : "Provider added");
      router.push(`/providers/${data.id}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Provider details</CardTitle>
            <CardDescription>Identity and credentialing basics used across Claims.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="providerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="individual">Individual clinician</SelectItem>
                      <SelectItem value="organization">Organization / group</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="npi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NPI</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" maxLength={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {providerType === "individual" ? (
              <>
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="credentialSuffix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credential suffix</FormLabel>
                      <FormControl>
                        <Input placeholder="MD, DO, NP, PA-C..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Organization name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialty</FormLabel>
                  <FormControl>
                    <Input placeholder="Internal Medicine" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxonomyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxonomy code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID (EIN)</FormLabel>
                  <FormControl>
                    <Input placeholder="12-3456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEdit && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Licensing &amp; contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="licenseState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License state</FormLabel>
                  <FormControl>
                    <Input maxLength={2} placeholder="NY" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deaNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DEA number</FormLabel>
                  <FormControl>
                    <Input placeholder="AB1234563" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <ProviderPortalAccessForm
          status={resolvedPortalStatus}
          value={portalCredentials}
          onChange={setPortalCredentials}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add provider"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
