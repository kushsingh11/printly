import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrder } from "@/lib/sheets";
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

  const order = await getOrder(id);
  if (!order || !order.receiptKey) return new NextResponse("Not found", { status: 404 });

  const allowed = session.user.role === "SHOPKEEPER" || order.studentEmail === session.user.email;
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const ext = order.receiptKey.slice(order.receiptKey.lastIndexOf(".")).toLowerCase();
  const buf = await readStored(order.receiptKey);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": TYPE_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="receipt-${order.code}${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
