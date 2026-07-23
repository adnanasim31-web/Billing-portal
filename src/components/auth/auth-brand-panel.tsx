import { Activity, ShieldCheck, TrendingUp } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: "Faster reimbursement",
    body: "Clean-claim scrubbing and real-time eligibility cut denials before they happen.",
  },
  {
    icon: Activity,
    title: "Full revenue cycle, one suite",
    body: "Claims, payment posting, denial management, and AR work queues in a single workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Built for compliance",
    body: "Role-based access, full audit trails, and 2FA keep every practice HIPAA-minded by default.",
  },
];

export function AuthBrandPanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(15,108,189,0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgba(15,108,189,0.25), transparent 40%)",
        }}
      />

      <div className="relative z-10 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          M
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">MedBill</p>
          <p className="text-[11px] uppercase tracking-wider text-sidebar-muted">RCM Suite</p>
        </div>
      </div>

      <div className="relative z-10 max-w-md space-y-10">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Revenue cycle management, modernized.
        </h1>
        <div className="space-y-6">
          {HIGHLIGHTS.map((item) => (
            <div key={item.title} className="flex gap-3.5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
                <item.icon className="h-4.5 w-4.5 text-primary-300" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-sm text-sidebar-muted">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="relative z-10 text-xs text-sidebar-muted">
        © {new Date().getFullYear()} MedBill RCM Suite. All rights reserved.
      </p>
    </div>
  );
}
