import { prisma } from "@/lib/prisma";

/** Atomically increment a counter and return a human-friendly code, e.g. "PR-241". */
export async function nextCode(name: "print" | "order" | "sku", prefix: string): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { name },
    update: { value: { increment: 1 } },
    create: { name, value: 1 },
  });
  return `${prefix}-${counter.value}`;
}
