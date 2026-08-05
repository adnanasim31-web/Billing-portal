import type { LucideIcon } from "lucide-react";
import { CalendarClock, CalendarDays, ReceiptText, ShieldCheck } from "lucide-react";

export interface ProviderPortalNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const PROVIDER_PORTAL_NAV: ProviderPortalNavItem[] = [
  { label: "Appointments", href: "/provider", icon: CalendarClock },
  { label: "Claims", href: "/provider/claims", icon: ReceiptText },
  { label: "Credentialing", href: "/provider/credentialing", icon: ShieldCheck },
  { label: "Availability", href: "/provider/availability", icon: CalendarDays },
];
