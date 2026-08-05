import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CalendarDays,
  FileText,
  LayoutDashboard,
  MessagesSquare,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

export interface ProviderPortalNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const PROVIDER_PORTAL_NAV: ProviderPortalNavItem[] = [
  { label: "Overview", href: "/provider", icon: LayoutDashboard },
  { label: "Appointments", href: "/provider/appointments", icon: CalendarClock },
  { label: "Claims", href: "/provider/claims", icon: ReceiptText },
  { label: "Credentialing", href: "/provider/credentialing", icon: ShieldCheck },
  { label: "Availability", href: "/provider/availability", icon: CalendarDays },
  { label: "Messages", href: "/provider/messages", icon: MessagesSquare },
  { label: "Documents", href: "/provider/documents", icon: FileText },
];
