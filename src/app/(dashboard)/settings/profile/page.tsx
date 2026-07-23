import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/current-user-service";
import { ProfileForm } from "@/components/settings/profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <ProfileForm
        defaultValues={{
          firstName: user.firstName,
          lastName: user.lastName,
          phone: "",
          jobTitle: user.jobTitle ?? "",
          timezone: "America/New_York",
          email: user.email,
          avatarUrl: user.avatarUrl,
        }}
      />
      <ChangePasswordForm />
    </div>
  );
}
