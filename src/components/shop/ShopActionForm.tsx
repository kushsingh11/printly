"use client";

import { useFormStatus } from "react-dom";

type Variant = "primary" | "ghost" | "danger" | "success";

const variantClass: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  success: "bg-success text-white hover:opacity-90",
  ghost: "border border-neutral-300 text-neutral-700 hover:bg-neutral-100",
  danger: "border border-red-300 text-red-700 hover:bg-red-50",
};

function Button({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${variantClass[variant]}`}
    >
      {pending ? "…" : children}
    </button>
  );
}

/** A one-click form bound to a shopkeeper server action. */
export function ShopActionForm({
  action,
  id,
  idName = "jobId",
  to,
  variant = "primary",
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  idName?: string;
  to?: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action} className={className}>
      <input type="hidden" name={idName} value={id} />
      {to && <input type="hidden" name="to" value={to} />}
      <Button variant={variant}>{children}</Button>
    </form>
  );
}
