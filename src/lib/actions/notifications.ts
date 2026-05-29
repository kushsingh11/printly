"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { markAllRead as apiMarkAllRead } from "@/lib/sheets";

export async function markAllRead() {
  const user = await requireUser();
  if (user.email) await apiMarkAllRead(user.email);
  revalidatePath("/notifications");
}
