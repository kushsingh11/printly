import { redirect } from "next/navigation";
import type { Role } from "@/lib/types";
import { auth } from "@/auth";

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Require a specific role; bounce to the root router (which re-routes by role). */
export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) redirect("/");
  return user;
}
