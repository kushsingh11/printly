import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { auth } from "@/auth";
import { saveTmpFile } from "@/lib/storage";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "STUDENT") {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25 MB)." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Must be a real PDF (magic bytes + parseable).
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf || bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return NextResponse.json({ error: "Only PDF files are supported right now." }, { status: 400 });
  }

  let pageCount: number;
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    pageCount = doc.getPageCount();
  } catch {
    return NextResponse.json({ error: "Couldn't read this PDF — it may be corrupted." }, { status: 400 });
  }
  if (pageCount < 1) {
    return NextResponse.json({ error: "This PDF has no pages." }, { status: 400 });
  }

  const token = await saveTmpFile(bytes, ".pdf");

  return NextResponse.json({
    token,
    fileName: file.name,
    pageCount,
    sizeBytes: file.size,
  });
}
