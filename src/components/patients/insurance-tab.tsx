"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus, ShieldPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { patientInsuranceSchema, type PatientInsuranceInput } from "@/lib/validations/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EmptyState } from "@/components/shared/empty-state";

export interface InsurancePolicyRow {
  id: string;
  rank: "primary" | "secondary" | "tertiary";
  payerName: string;
  planName: string | null;
  policyNumber: string;
  groupNumber: string | null;
  subscriberName: string;
  subscriberRelationship: string;
  effectiveDate: string | null;
  terminationDate: string | null;
  isActive: boolean;
}

export function InsuranceTab({ patientId, policies }: { patientId: string; policies: InsurancePolicyRow[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deactivatingId, setDeactivatingId] = React.useState<string | null>(null);

  const form = useForm<PatientInsuranceInput>({
    resolver: zodResolver(patientInsuranceSchema),
    defaultValues: {
      rank: "primary",
      payerName: "",
      payerIdCode: "",
      planName: "",
      policyNumber: "",
      groupNumber: "",
      subscriberName: "",
      subscriberDob: "",
      subscriberRelationship: "self",
      effectiveDate: "",
      terminationDate: "",
      isActive: true,
    },
  });

  async function onSubmit(values: PatientInsuranceInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/insurance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add insurance policy");
        return;
      }
      toast.success("Insurance policy added");
      form.reset();
      setOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(policyId: string) {
    setDeactivatingId(policyId);
    try {
      const res = await fetch(`/api/patients/${patientId}/insurance/${policyId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Unable to update policy");
        return;
      }
      toast.success("Policy marked inactive");
      router.refresh();
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add insurance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add insurance policy</DialogTitle>
              <DialogDescription>
                Adding an active policy for a rank already on file will supersede the existing one.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rank"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rank</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="primary">Primary</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                            <SelectItem value="tertiary">Tertiary</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="payerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payer name</FormLabel>
                        <FormControl>
                          <Input placeholder="Aetna" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="planName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="payerIdCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payer ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="policyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="groupNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="subscriberName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscriber name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subscriberRelationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="self">Self</SelectItem>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="effectiveDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effective date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="terminationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Termination date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0 cursor-pointer font-normal">Active policy</FormLabel>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save policy
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {policies.length === 0 ? (
        <EmptyState
          icon={ShieldPlus}
          title="No insurance on file"
          description="Add the patient's primary insurance to get started."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {policies.map((policy) => (
            <Card key={policy.id} className={!policy.isActive ? "opacity-60" : undefined}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base capitalize">
                    {policy.rank}
                    {policy.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  <p className="mt-1 text-sm font-medium">{policy.payerName}</p>
                  {policy.planName && <p className="text-xs text-muted-foreground">{policy.planName}</p>}
                </div>
                {policy.isActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={deactivatingId === policy.id}
                    onClick={() => handleDeactivate(policy.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Policy #</span> {policy.policyNumber}
                </p>
                {policy.groupNumber && (
                  <p>
                    <span className="text-muted-foreground">Group #</span> {policy.groupNumber}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Subscriber</span> {policy.subscriberName} (
                  {policy.subscriberRelationship})
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
