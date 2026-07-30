import type { LucideIcon } from "lucide-react";
import {
  AlertOctagon,
  BadgeCheck,
  CalendarClock,
  FileStack,
  Gauge,
  LayoutDashboard,
  LibraryBig,
  LineChart,
  MessagesSquare,
  Receipt,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Modules not yet shipped (post Module 1) render disabled with a "Soon" badge. */
  enabled: boolean;
  permission?: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { label: "Claims", href: "/claims", icon: ReceiptText, enabled: true },
  { label: "Patients", href: "/patients", icon: Users, enabled: true },
  { label: "Eligibility", href: "/eligibility", icon: BadgeCheck, enabled: true },
  { label: "Insurance", href: "/insurance", icon: ShieldAlert, enabled: true },
  { label: "Payments", href: "/payments", icon: Wallet, enabled: true },
  { label: "Denials", href: "/denials", icon: AlertOctagon, enabled: true },
  { label: "Appointments", href: "/appointments", icon: CalendarClock, enabled: true },
  { label: "Coding Library", href: "/coding", icon: LibraryBig, enabled: true },
  { label: "Providers", href: "/providers", icon: Stethoscope, enabled: true },
  { label: "Credentialing", href: "/credentialing", icon: ShieldCheck, enabled: true },
  { label: "Accounts Receivable", href: "/ar", icon: Gauge, enabled: true },
  { label: "Reports", href: "/reports", icon: LineChart, enabled: true },
  { label: "Documents", href: "/documents", icon: FileStack, enabled: false },
  { label: "Messages", href: "/messages", icon: MessagesSquare, enabled: false },
  { label: "Billing & Plan", href: "/billing", icon: Receipt, enabled: false },
];
