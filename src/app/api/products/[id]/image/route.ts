import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readStored } from "@/lib/storage";

const TYPE_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// Public catalog image (non-sensitive).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { imagePath: true } });
  if (!product?.imagePath) return new NextResponse("Not found", { status: 404 });

  const ext = product.imagePath.slice(product.imagePath.lastIndexOf(".")).toLowerCase();
  const buf = await readStored(product.imagePath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": TYPE_BY_EXT[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=60",
    },
  });
}
