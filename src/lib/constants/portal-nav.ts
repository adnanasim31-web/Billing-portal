import type { LucideIcon } from "lucide-react";
import { CreditCard, FileText, FolderOpen, User } from "lucide-react";

export interface PortalNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const PORTAL_NAV: PortalNavItem[] = [
  { label: "Profile", href: "/portal/profile", icon: User },
  { label: "Statements", href: "/portal", icon: FileText },
  { label: "Payment history", href: "/portal/payments", icon: CreditCard },
  { label: "Documents", href: "/portal/documents", icon: FolderOpen },
];
