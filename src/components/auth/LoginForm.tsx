"use client";

import Link from "next/link";
import { useActionState } from "react";
import { googleLogin, loginAction, type AuthState } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";

const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
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

      {googleEnabled && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />
            or
            <span className="h-px flex-1 bg-neutral-200" />
          </div>

          <form action={googleLogin}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 43.5c5.5 0 10.3-2.1 13.9-5.5l-6.4-5.4C29.4 34.5 26.9 35.5 24 35.5c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.6 39 16.2 43.5 24 43.5z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.4 5.4C41.4 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              Continue with Google
            </button>
          </form>
        </>
      )}

      <p className="mt-4 text-center text-sm text-neutral-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Create a student account
        </Link>
      </p>
    </div>
  );
}
