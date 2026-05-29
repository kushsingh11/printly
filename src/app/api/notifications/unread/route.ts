import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unreadCount } from "@/lib/sheets";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ count: 0 });
  const count = await unreadCount(session.user.email);
  return NextResponse.json({ count });
}
