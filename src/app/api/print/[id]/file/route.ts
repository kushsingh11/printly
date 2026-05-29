import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrintJob } from "@/lib/sheets";
import { readStored } from "@/lib/storage";

// Streams a job's source PDF to its owner or any shopkeeper. Never public.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const job = await getPrintJob(id);
  if (!job || !job.fileKey) return new NextResponse("Not found", { status: 404 });

  const allowed = session.user.role === "SHOPKEEPER" || job.studentEmail === session.user.email;
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  const buf = await readStored(job.fileKey);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(job.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
