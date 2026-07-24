import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ProviderForm } from "@/components/providers/provider-form";

export const metadata: Metadata = { title: "Add Provider" };

export default function NewProviderPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Add a provider" description="Add a rendering or billing provider to your roster." />
      <ProviderForm />
    </div>
  );
}
