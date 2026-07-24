import { cn } from "@/lib/utils";

/** Small uppercase eyebrow label ("// LIKE THIS") used above brand-forward headlines. */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-400", className)}>
      <span aria-hidden className="text-primary-500">
        {"//"}
      </span>
      {children}
    </p>
  );
}
