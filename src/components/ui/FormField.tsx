import { useId } from "react";
import type { ReactNode } from "react";

export function FormField({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children(id)}
      {hint && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
