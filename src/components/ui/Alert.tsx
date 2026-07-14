import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "../../lib/cn";

type Variant = "error" | "success" | "info";

const VARIANT_CONFIG: Record<Variant, { classes: string; Icon: typeof AlertCircle }> = {
  error: {
    classes: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
    Icon: AlertCircle,
  },
  success: {
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  info: {
    classes: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
    Icon: Info,
  },
};

export function Alert({ variant = "error", children }: { variant?: Variant; children: React.ReactNode }) {
  const { classes, Icon } = VARIANT_CONFIG[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium", classes)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
