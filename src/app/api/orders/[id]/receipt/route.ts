import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readStored } from "@/lib/storage";

const TYPE_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
};

// Streams a store order's payment receipt to its owner or any shopkeeper.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const order = await prisma.shopOrder.findUnique({ where: { id } });
  if (!order || !order.receiptPath) return new NextResponse("Not found", { status: 404 });

  const allowed = session.user.role === "SHOPKEEPER" || order.studentId === session.user.id;
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const ext = order.receiptPath.slice(order.receiptPath.lastIndexOf(".")).toLowerCase();
  const buf = await readStored(order.receiptPath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": TYPE_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="receipt-${order.code}${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
