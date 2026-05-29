import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Create an in-app notification for a user. */
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  linkPath?: string,
) {
  await prisma.notification.create({
    data: { userId, type, title, body, linkPath: linkPath ?? null },
  });
}
