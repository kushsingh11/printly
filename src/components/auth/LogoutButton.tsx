import { logoutAction } from "@/lib/actions/auth";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={
          className ??
          "rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
        }
      >
        Log out
      </button>
    </form>
  );
}
