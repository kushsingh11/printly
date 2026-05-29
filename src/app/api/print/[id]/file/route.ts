import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readStored } from "@/lib/storage";

// Streams a job's source PDF to its owner or any shopkeeper. Never public.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const job = await prisma.printJob.findUnique({ where: { id } });
  if (!job || !job.filePath) return new NextResponse("Not found", { status: 404 });

  const allowed = session.user.role === "SHOPKEEPER" || job.studentId === session.user.id;
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const buf = await readStored(job.filePath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(job.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
