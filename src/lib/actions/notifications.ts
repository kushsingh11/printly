"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/lib/session";
import { markAllRead as apiMarkAllRead, CACHE_TAGS } from "@/lib/sheets";

export async function markAllRead() {
  const user = await requireUser();
  if (user.email) await apiMarkAllRead(user.email);
  updateTag(CACHE_TAGS.notifications);
  revalidatePath("/notifications");
}
