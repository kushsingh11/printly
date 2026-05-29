"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthState } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";

const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function LoginPage() {
  const [state, formAction] = useActionState<AuthState, FormData>(loginAction, undefined);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Log in</h2>
      <p className="mb-4 mt-0.5 text-sm text-neutral-500">Welcome back.</p>

      <form action={formAction} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Email</label>
          <input name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@college.edu" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Password</label>
          <input name="password" type="password" autoComplete="current-password" required className={inputClass} placeholder="••••••••" />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <SubmitButton>Log in</SubmitButton>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Create a student account
        </Link>
      </p>
    </div>
  );
}
